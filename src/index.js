import React from 'react'
import PropTypes from 'prop-types'
import deepEqual from './lib/equal'
import debounce from './lib/debounce'
import Loader from './components/Loader'

export default class Mozaika extends React.PureComponent {
  constructor(props) {
    super(props)

    this.state = {
      data: [],
      computedStyles: [],
      loading: true,
      totalHeight: 0,
      maxElementsReached: false
    }

    this.gallery = React.createRef()
    this.columnHeights = []
    this.heights = []
    this.width = 0

    this.handleResize = this.handleResize.bind(this)
    this.updateGalleryWith = this.updateGalleryWith.bind(this)
    this.computeElementStyles = this.computeElementStyles.bind(this)
    this.updateHeightFromComponent = this.updateHeightFromComponent.bind(this)
  }

  static get propTypes() {
    return {
      data: PropTypes.arrayOf(PropTypes.object).isRequired,
      ExplorerElement: PropTypes.object.isRequired,
      elementProps: PropTypes.object,
      children: PropTypes.any
    }
  }

  // TODO: We could parameterize these and let user specify them as props.
  static ELEMENT_LOAD_BATCH_SIZE = 15
  static COLUMN_WIDTH = 300
  static MAX_COLUMNS = 8

  // TODO: We can parameterize the 'id' that's used to identify the gallery container.
  getChildren() {
    const nodes = document.querySelectorAll(`#gallery > div`)

    return Array.from(nodes).map((element) => {
      return element.dataset.viewed
    })
  }

  // Perform initial setup for the gallery layout to properly work. We must do three things to start off the gallery.
  // 1. Initialise the IntersectionObserver and attach the handleIntersection() function. This is used to determine
  //    if the we should attempt to load the next batch of elements.
  //
  // 2. Attach an event listener for window re-size events so that the gallery layout can
  //   be re-calculated when the browser window is resized.
  //
  // 3. Perform an initial layout calculation for the first group of elements to be added to the gallery.
  //
  componentDidMount() {
    this._isMounted = true
    this.width = window.innerWidth // Important to now set the width parameter once we mount!

    // eslint-disable-next-line no-undef
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      }
    )

    // Check if no data was provided.
    if (this.props.data.length === 0) {
      this.setState({ maxElementsReached: true, loading: false })
    } else {
      this.setState(
        this.updateGalleryWith(
          this.props.data.slice(0, Mozaika.ELEMENT_LOAD_BATCH_SIZE)
        )
      )
    }

    window.addEventListener('resize', this.handleResize)
  }

  // Remove the event listener and disconnect the intersection observer.
  componentWillUnmount() {
    this._isMounted = false

    window.removeEventListener('resize', this.handleResize)
    this.observer.disconnect()
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const views = this.getChildren()

    // if the gallery exists within the DOM, and this is after an initial render, (first render, or after elements
    // were add to the gallery) initiate an IntersectionObserver to monitor image view-ability
    if (!this.state.maxElementsReached) {
      const nodes = document.querySelectorAll(`#gallery > div`)

      // Check if the element has a 'viewed' data key, if not add it to the observer &
      // add the data key to element, otherwise do nothing with element, we don't need to
      // do anything, if the key is already present as this  is a guarantee that it is being
      // observer or it has been viewed.
      nodes.forEach((element, key) => {
        element.dataset.viewed = views[key] ? views[key] : false
        if (element.dataset.viewed === 'false') {
          this.observer.observe(element)
        }
      })
    }
  }

  updateHeightFromComponent(index, height) {
    if (this.heights[index] !== height) {
      this.heights[index] = height
    }

    if (
      Object.keys(this.heights).length === this.state.data.length &&
      !deepEqual(this.heights, this.oldHeightMap)
    ) {
      this.oldHeightMap = this.heights.slice()
      this.updateExplorerUsingHeightMap(this.heights)
    }
  }

  updateExplorerUsingHeightMap(heightMap) {
    this.columnHeights = Array(
      Math.min(
        Math.round(window.innerWidth / Mozaika.COLUMN_WIDTH),
        Mozaika.MAX_COLUMNS
      )
    ).fill(0)
    const width = Math.round(window.innerWidth / this.columnHeights.length)

    const computedStyles = []

    for (const index in Object.keys(this.state.data)) {
      // Get the smallest column height, we will be adding the image to this column
      const nextColumn = this.columnHeights.indexOf(
        Math.min(...this.columnHeights)
      )

      const elementStyles = {
        visibility: 'visible',
        width: nextColumn === this.columnHeights.length - 1 ? width : width - 5,
        height: heightMap[index],
        top: this.columnHeights[nextColumn] + 5,
        left: nextColumn * width
      }

      // Let's update the column height now & the computed styles for this element
      this.columnHeights[nextColumn] = elementStyles.top + heightMap[index]
      computedStyles.push(elementStyles)
    }

    // Now add the new computed height of the 'lowest' (largest top value) element to the total height
    // of the gallery, plus it's height and the bottom margin
    const totalHeight = Math.max(
      ...computedStyles.map((element) => {
        return element.height + element.top
      })
    )

    this.setState({ totalHeight, computedStyles, loading: false })
  }

  updateGalleryWith(data) {
    const dataCopy = [...data]
    this.columnHeights = Array(
      Math.min(
        Math.round(this.gallery.current.clientWidth / Mozaika.COLUMN_WIDTH),
        Mozaika.MAX_COLUMNS
      )
    ).fill(0)

    // copy over computed styles from old state.
    let computedStyles = [...this.state.computedStyles]

    if (this.state.data.length < data.length && this.state.data.length !== 0) {
      const newStyles = dataCopy
        .splice(this.state.data.length, data.length)
        .map(() => this.computeElementStyles())

      computedStyles.push(...newStyles)
    } else {
      this.heights = []

      computedStyles = data.map(() => this.computeElementStyles())
    }

    return { computedStyles, data, loading: true }
  }

  // This method is only used for the 'onresize' listener
  handleResize = debounce(() => {
    if (this._isMounted && this.width !== window.innerWidth) {
      this.width = window.innerWidth

      this.setState(this.updateGalleryWith(this.state.data))
    }
  })

  computeElementStyles() {
    const columns = this.columnHeights.length
    const width = Math.round(this.gallery.current.clientWidth / columns)

    // Get the smallest column height, we will be adding the image to this column
    const nextColumn = this.columnHeights.indexOf(
      Math.min(...this.columnHeights)
    )

    const elementStyles = {
      visibility: 'hidden',
      width: nextColumn === this.columnHeights.length - 1 ? width : width - 5,
      top: this.columnHeights[nextColumn],
      left: nextColumn * width + 5
    }

    // Let's update the column height now & the computed styles for this element
    this.columnHeights[nextColumn] = elementStyles.top + 1000
    return elementStyles
  }

  handleIntersection(entries, observerObject) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.setAttribute('data-viewed', 'true')
        observerObject.unobserve(entry.target)

        // check if this is the last photo element or all elements have been viewed
        // if more elements can be retrieved; append next batch, otherwise disconnect observer
        const views = this.getChildren()

        if (views.every((view) => view === 'true')) {
          if (views.length === this.props.data.length) {
            this.setState({ maxElementsReached: true })

            observerObject.disconnect()
          } else {
            this.setState(
              this.updateGalleryWith(
                this.props.data.slice(
                  0,
                  this.state.data.length + Mozaika.ELEMENT_LOAD_BATCH_SIZE
                )
              )
            )
          }
        }
      }
    })
  }

  render() {
    const { children, ExplorerElement, elementProps } = this.props
    const {
      data,
      loading,
      totalHeight,
      computedStyles,
      maxElementsReached
    } = this.state

    return (
      <div>
        <div
          id='gallery'
          style={{
            height: isNaN(totalHeight) ? '100%' : totalHeight,
            width: '100%',
            position: 'relative',
            boxSizing: 'content-box',
            display: 'inline-block',
            background: '#0f0f10', // TODO: Make this a prop.
            paddingBottom: '5px'
          }}
          ref={this.gallery}
        >
          {data.map((element, index) => {
            return (
              <ExplorerElement
                {...elementProps}
                index={index}
                key={index}
                data={element}
                updateCallback={(ref) => {
                  this.updateHeightFromComponent(
                    index,
                    ref.current.clientHeight
                  )
                }}
                style={computedStyles[index]}
              />
            )
          })}
        </div>
        {loading ? <Loader /> : null}
        <div
          style={{ display: maxElementsReached && !loading ? 'block' : 'none' }}
        >
          {children}
        </div>
      </div>
    )
  }
}
