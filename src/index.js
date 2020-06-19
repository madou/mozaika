import React from 'react';
import PropTypes from 'prop-types';
import deepEqual from './lib/equal';
import debounce from './lib/debounce';
import Loader from './components/Loader';

export default class Mozaika extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
      computedStyles: [],
      loading: true,
      totalHeight: 0,
      maxElementsReached: false
    };

    this.gallery = React.createRef();
    this.columnHeights = [];
    this.heights = [];
    this.width = 0;

    this.getChildren = this.getChildren.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.getNewColumnHeights = this.getNewColumnHeights.bind(this);
    this.updateGalleryWith = this.updateGalleryWith.bind(this);
    this.computeElementStyles = this.computeElementStyles.bind(this);
    this.updateHeightFromComponent = this.updateHeightFromComponent.bind(this);
  }

  static get propTypes() {
    return {
      data: PropTypes.arrayOf(PropTypes.object).isRequired,
      ExplorerElement: PropTypes.oneOfType([PropTypes.func, PropTypes.object]).isRequired,
      id: PropTypes.string,
      elementProps: PropTypes.object,
      loadBatchSize: PropTypes.number,
      maxColumns: PropTypes.number,
      children: PropTypes.any,
      backgroundColour: PropTypes.string,
      loaderStrokeColour: PropTypes.string
    };
  }

  static defaultProps = {
    loadBatchSize: 15,
    maxColumns: 8,
    backgroundColour: '#0f0f10',
    loaderStrokeColour: 'hsl(0, 100%, 100%)'
  };

  // TODO: We could parameterize these and let user specify them as props.
  static COLUMN_WIDTH = 300;

  getChildren() {
    if (this.gallery.current === null) return [];

    return Array.from(this.gallery.current.childNodes);
  }

  getNewColumnHeights() {
    return Array(
      Math.min(Math.round(this.gallery.current.clientWidth / Mozaika.COLUMN_WIDTH), this.props.maxColumns)
    ).fill(0);
  }

  /* Perform initial setup for the gallery layout to properly work. We must do three things to start off the gallery.
  // 1. Initialise the IntersectionObserver and attach the handleIntersection() function. This is used to determine
  //    if the we should attempt to load the next batch of elements.
  //
  // 2. Attach an event listener for window re-size events so that the gallery layout can
  //   be re-calculated when the browser window is resized.
  //
  // 3. Perform an initial layout calculation for the first group of elements to be added to the gallery.
  */
  componentDidMount() {
    this._isMounted = true;
    this.width = window.innerWidth; // Important to now set the width parameter once we mount!

    const { data, loadBatchSize, maxColumns } = this.props;

    // eslint-disable-next-line no-undef
    this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    });

    // Check that the 'loadBatchSize' is a positive integer.
    if (!Number.isInteger(loadBatchSize) || loadBatchSize < 0) {
      throw new Error(`loadBatchSize must be a positive integer, not ${loadBatchSize}`);
    }

    // Check that the 'maxColumns' is a positive integer.
    if (!Number.isInteger(maxColumns) || maxColumns < 0) {
      throw new Error(`maxColumns must be a positive integer, not ${maxColumns}`);
    }

    // Check if no data was provided.
    if (data.length === 0) {
      this.setState({ maxElementsReached: true, loading: false });
    } else {
      this.setState(this.updateGalleryWith(data.slice(0, loadBatchSize)));
    }

    window.addEventListener('resize', this.handleResize);
  }

  // Remove the event listener and disconnect the intersection observer.
  componentWillUnmount() {
    this._isMounted = false;

    window.removeEventListener('resize', this.handleResize);
    this.observer.disconnect();
  }

  // TODO: we will have to re-compute the layout if the maxColumns changes.
  componentDidUpdate(prevProps, prevState, snapshot) {
    // if the gallery exists within the DOM, and this is after an initial render, (first render, or after elements
    // were add to the gallery) initiate an IntersectionObserver to monitor image view-ability
    if (!this.state.maxElementsReached) {
      const nodes = this.getChildren();

      // Check if the element has a 'viewed' data key, if not add it to the observer &
      // add the data key to element, otherwise do nothing with element, we don't need to
      // do anything, if the key is already present as this  is a guarantee that it is being
      // observer or it has been viewed.
      nodes.forEach((element) => {
        element.dataset.viewed = element.dataset.viewed || false;

        if (element.dataset.viewed === 'false') {
          this.observer.observe(element);
        }
      });
    }
  }

  /**
   * This function is used to update the 'height' of each child element when children
   * call 'updateCallback' function to supply computed height. Updates to the map are
   * prevented if 'loading' state of the component is false to prevent chained updates
   * of single components and if the height of component hasn't changed.
   *
   * @param {number} index - The index of the child that is being updated.
   * @param {number} height - The computed height value from the component.
   * */
  updateHeightFromComponent(index, height) {
    if (this.heights[index] !== height && this.state.loading) {
      this.heights[index] = height;
    }

    if (Object.keys(this.heights).length === this.state.data.length && !deepEqual(this.heights, this.oldHeightMap)) {
      this.oldHeightMap = this.heights.slice();
      this.updateExplorerUsingHeightMap(this.heights);
    }
  }

  updateExplorerUsingHeightMap(heightMap) {
    this.columnHeights = this.getNewColumnHeights();

    const width = Math.round(this.gallery.current.clientWidth / this.columnHeights.length);

    const computedStyles = [];

    for (const index in Object.keys(this.state.data)) {
      // Get the smallest column height, we will be adding the image to this column
      const nextColumn = this.columnHeights.indexOf(Math.min(...this.columnHeights));

      const elementStyles = {
        visibility: 'visible',
        width: nextColumn === this.columnHeights.length - 1 ? width : width - 5,
        height: heightMap[index],
        top: this.columnHeights[nextColumn] + 5,
        left: nextColumn * width
      };

      // Let's update the column height now & the computed styles for this element
      this.columnHeights[nextColumn] = elementStyles.top + heightMap[index];
      computedStyles.push(elementStyles);
    }

    // Now add the new computed height of the 'lowest' (largest top value) element to the total height
    // of the gallery, plus it's height and the bottom margin
    const totalHeight = Math.max(
      ...computedStyles.map((element) => {
        return element.height + element.top;
      })
    );

    this.setState({ totalHeight, computedStyles, loading: false });
  }

  updateGalleryWith(data) {
    const dataCopy = [...data];
    let computedStyles = [...this.state.computedStyles]; // copy over computed styles from old state.
    this.columnHeights = this.getNewColumnHeights();

    if (this.state.data.length < data.length && this.state.data.length !== 0) {
      const newStyles = dataCopy.splice(this.state.data.length, data.length).map(() => this.computeElementStyles());

      computedStyles.push(...newStyles);
    } else {
      this.heights = [];

      computedStyles = data.map(() => this.computeElementStyles());
    }

    return { computedStyles, data, loading: true };
  }

  // This method is only used for the 'onresize' listener
  handleResize = debounce(() => {
    if (this._isMounted && this.width !== window.innerWidth) {
      this.width = window.innerWidth;

      this.setState(this.updateGalleryWith(this.state.data));
    }
  });

  computeElementStyles() {
    const columns = this.columnHeights.length;
    const width = Math.round(this.gallery.current.clientWidth / columns);

    // Get the smallest column height, we will be adding the image to this column
    const nextColumn = this.columnHeights.indexOf(Math.min(...this.columnHeights));

    const elementStyles = {
      visibility: 'hidden',
      width: nextColumn === this.columnHeights.length - 1 ? width : width - 5,
      top: this.columnHeights[nextColumn],
      left: nextColumn * width + 5
    };

    // Let's update the column height now & the computed styles for this element
    this.columnHeights[nextColumn] = elementStyles.top + 1000;
    return elementStyles;
  }

  handleIntersection(entries, observerObject) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.setAttribute('data-viewed', 'true');
        observerObject.unobserve(entry.target);

        // check if this is the last photo element or all elements have been viewed
        // if more elements can be retrieved; append next batch, otherwise disconnect observer
        const children = this.getChildren();

        if (children.every((node) => node.dataset.viewed === 'true')) {
          if (children.length === this.props.data.length) {
            this.setState({ maxElementsReached: true });

            observerObject.disconnect();
          } else {
            this.setState(
              this.updateGalleryWith(this.props.data.slice(0, this.state.data.length + this.props.loadBatchSize))
            );
          }
        }
      }
    });
  }

  render() {
    const { children, ExplorerElement, backgroundColour, loaderStrokeColour, elementProps } = this.props;

    const { data, loading, totalHeight, computedStyles, maxElementsReached } = this.state;

    return (
      <div
        style={{
          background: backgroundColour
        }}
      >
        <div
          {...(this.props.id && { id: this.props.id })}
          style={{
            height: totalHeight === 0 ? '100% !important' : totalHeight,
            width: '100%',
            position: 'relative',
            boxSizing: 'content-box',
            display: 'inline-block',
            background: backgroundColour,
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
                  this.updateHeightFromComponent(index, ref.current.clientHeight);
                }}
                style={computedStyles[index]}
              />
            );
          })}
        </div>
        {loading ? <Loader strokeColour={loaderStrokeColour} /> : null}
        <div style={{ display: maxElementsReached && !loading ? 'block' : 'none' }}>{children}</div>
      </div>
    );
  }
}
