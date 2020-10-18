import React from 'react';
import PropTypes from 'prop-types';
import deepEqual from './lib/equal';
import debounce from './lib/debounce';
import Loader from './components/Loader';

// Load in ResizeObserver API if it's not natively supported.
// @see See [https://caniuse.com/#feat=resizeobserver]
import { ResizeObserver } from '@juggle/resize-observer';

// Load in IntersectionObserver API if it's not natively supported.
// @see See [https://caniuse.com/#feat=intersectionobserver]
require('intersection-observer');

export default class Mozaika extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
      computedStyles: [],
      loading: true,
      totalHeight: 0,
      maxElementsReached: false,
      maxDataReached: false // Used with 'stream mode'
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
      /** Adjust the Y-scroll position when container/window gets resized */
      adjustScroll: PropTypes.bool,
      /** The background colour of the gallery */
      backgroundColour: PropTypes.string,
      /** Any content or React Sub-tree that is loaded after the all the content is loaded. */
      children: PropTypes.any,
      /** The data that is used to populate the items that are loaded into the gallery. */
      data: PropTypes.arrayOf(PropTypes.object).isRequired,
      /** The Component/Function Component that is used as an item in the gallery. */
      Element: PropTypes.oneOfType([PropTypes.func, PropTypes.object]).isRequired,
      /** Any props that should be passed to element objects when appending them into the view. */
      ElementProps: PropTypes.object,
      /** The 'id' attribute of the gallery container. */
      id: PropTypes.string,
      /** The quantity of items that is attempted to be added when gallery attempts to append more elements
       * into the view. */
      loadBatchSize: PropTypes.number,
      /** Colour of the provided loader */
      loaderStrokeColour: PropTypes.string,
      /** The maximum number of columns the gallery can use to display items. */
      maxColumns: PropTypes.number,
      /** Function callback that is invoked when a layout cycle is complete. The width, height, and computed
       * styles of elements are piped into callback. */
      onLayout: PropTypes.func,
      /** Flag to determine if we're expecting data to come in as a stream instead of a singular chunk */
      streamMode: PropTypes.bool,
      /** This key is used to reset a stream flow, if it changes at any point; Mozaika will assume that we begun
       * a new stream order. */
      resetStreamKey: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
      /** Forces layout of items to be in the exact order given by the caller. No height optimisations will be
       * carried out if 'strict' order is specified. */
      strictOrder: PropTypes.bool.isRequired
    };
  }

  static defaultProps = {
    adjustScroll: true,
    backgroundColour: '#0f0f10',
    loadBatchSize: 15,
    loaderStrokeColour: 'hsl(0, 100%, 100%)',
    maxColumns: 8,
    streamMode: false,
    resetStreamKey: null,
    strictOrder: false
  };

  // TODO: We could parameterize these and let user specify them as props.
  /** The width of each column that is used for the gallery */
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
   * 1. Initialise the IntersectionObserver and attach the handleIntersection() function. This is used to determine
   *    if the we should attempt to load the next batch of elements.
   *
   * 2. Attach an event listener for window re-size events so that the gallery layout can
   *   be re-calculated when the browser window is resized.
   *
   * 3. Perform an initial layout calculation for the first group of elements to be added to the gallery.
   */
  componentDidMount() {
    this._isMounted = true;
    const { data, loadBatchSize, maxColumns } = this.props;

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

    this.width = this.gallery.current.clientWidth; // Important to now set the width parameter once we mount!

    // eslint-disable-next-line no-undef
    this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    });

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.gallery.current);
  }

  /**
   * On the Component un-mount event, we'll set '_isMounted' to false preventing any future 'resize' update
   * event and disconnect the 'IntersectionObserver' and 'ResizeObserver' components by calling 'disconnect'.
   * */
  componentWillUnmount() {
    this._isMounted = false;

    this.observer.disconnect();
    this.resizeObserver.disconnect();
  }

  /**
   * On a component update, we need to check for several things. The first thing that we need to check
   * is if the 'data' prop has changed as this means a reset of the entire state.
   *
   * We also need to check if a new batch of items has been flagged for loading, this is done by checking if
   * the 'maxElementsReached' flag is set to true. If it has been set, we don't need to observe the current items
   * in the viewport. If not set, we'll select all the items that haven't already been observed by the IntersectionObserver.
   * */
  async componentDidUpdate(prevProps, prevState, snapshot) {
    // If the maxColumns prop changes, we have to re-compute the entire layout.
    if (prevProps.maxColumns !== this.props.maxColumns) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState(this.updateGalleryWith(this.state.data));
    }

    if (this.props.streamMode && !deepEqual(prevProps.resetStreamKey, this.props.resetStreamKey)) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        data: [],
        loading: true,
        maxElementsReached: false,
        maxDataReached: false
      });
    }

    if (this.props.data.length > 0 && !deepEqual(prevProps.data, this.props.data)) {
      if (!this.props.streamMode) {
        const calculatedState = this.updateGalleryWith(this.props.data.slice(0, this.props.loadBatchSize));

        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({ ...calculatedState, maxElementsReached: false });
      } else {
        // We'll need to patch in the current data state with the new prop by determining the offset.
        // Example: if current data is of size 50 and prop data is now 100, we need to begin loading
        // from 50 instead of 0, or otherwise we will duplicate the first 50 items.
        const calculatedState = this.updateGalleryWith(
          this.props.data.slice(0, this.props.loadBatchSize + this.state.data.length)
        );

        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({ ...calculatedState, maxElementsReached: false });
      }
    }

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
    } else if (
      this.props.streamMode &&
      !this.state.maxDataReached &&
      this.props.data.length > 0 &&
      this.props.data.length === this.state.data.length
    ) {
      // We'll need to load more data when we reach this state by invoking the user
      // provided prop function 'onNextBatch'. If the function wasn't provided, we throw
      // an error since we can't load anything without the function.
      //
      // This function doesn't return the next data batch because it could be async and therefore
      // waiting for the request to complete when we could be propagating other updates
      // is inefficient, and thus we expect the 'data' prop to be modified.
      if (typeof this.props.onNextBatch !== 'function') {
        throw new Error(`When Mozaika is in 'stream' mode, a 'onNextBatch' function is expected to be provided.`);
      }
      // The result will determine if we have exhausted all the data which can be loaded. If onNextBatch returns
      // false, this means that the data store has been exhausted and therefore there is no more data to be loaded.
      const result = this.props.onNextBatch();

      if (!result) {
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({ maxDataReached: true });
      }
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

    if (
      Object.keys(this.heights).length === this.state.data.length &&
      (!deepEqual(this.heights, this.oldHeightMap) || this.state.loading)
    ) {
      this.oldHeightMap = this.heights.slice();
      this.updateExplorerUsingHeightMap(this.heights);
    }
  }

  updateExplorerUsingHeightMap(heightMap) {
    this.columnHeights = this.getNewColumnHeights();

    const width = Math.round(this.gallery.current.clientWidth / this.columnHeights.length);
    const computedStyles = [];

    for (const index in Object.keys(this.state.data)) {
      let nextColumn = 0;

      // Strict order enforces that items are rendered in the order they are supplied.
      if (this.props.strictOrder) {
        nextColumn = index % this.columnHeights.length;
      } else {
        // Get the smallest column height, we will be adding the image to this column
        nextColumn = this.columnHeights.indexOf(Math.min(...this.columnHeights));
      }

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

    // Call 'onLayout' function (if defined) to notify anyone who's listening for layout updates
    this.setState({ totalHeight, computedStyles, loading: false }, () => {
      if (this.props.onLayout) this.props.onLayout({ height: totalHeight, width: this.width, computedStyles });
    });
  }

  updateGalleryWith(data) {
    const dataCopy = [...data];
    let computedStyles = [...this.state.computedStyles]; // copy over computed styles from old state.
    this.columnHeights = this.getNewColumnHeights();

    if (this.state.data.length < data.length && this.state.data.length !== 0) {
      const newStyles = dataCopy.splice(this.state.data.length, data.length).map((item, index) => {
        return this.computeElementStyles(index);
      });

      computedStyles.push(...newStyles);
    } else {
      this.heights = [];

      computedStyles = data.map((item, index) => this.computeElementStyles(index));
    }

    return { computedStyles, data, loading: true };
  }

  // This method is only used for the 'onresize' listener
  handleResize = (entries, observer) => {
    debounce(() => {
      if (this._isMounted && this.width !== entries[0].contentRect.width && this.props.data.length > 0) {
        if (this.props.adjustScroll) {
          // Essentially we are working out the ratio between the old height and
          // the new height of the container and then applying it to the current
          // pageYOffset value. So when the container is resized, the user should
          // remain where they were in relative terms.
          const heightRatio = this.state.totalHeight / entries[0].contentRect.height;

          window.scrollTo(0, window.pageYOffset * heightRatio);
        }

        this.width = entries[0].contentRect.width;
        this.setState(this.updateGalleryWith(this.state.data));
      }
    })();
  };

  computeElementStyles(index) {
    const width = Math.round(this.gallery.current.clientWidth / this.columnHeights.length);

    let nextColumn = 0;

    // Strict order enforces that items are rendered in the order they are supplied.
    if (this.props.strictOrder) {
      nextColumn = index % this.columnHeights.length;
    } else {
      // Get the smallest column height, we will be adding the image to this column
      nextColumn = this.columnHeights.indexOf(Math.min(...this.columnHeights));
    }

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
      }
    });

    // Prevent any updates while we're loading in new items.
    if (this.state.loading) return;

    // check if this is the last photo element or all elements have been viewed
    // if more elements can be retrieved; append next batch, otherwise disconnect observer
    const viewed = this.getChildren().map((node) => node.dataset.viewed);
    const bottomElements = viewed.slice(viewed.length - this.columnHeights.length, viewed.length);

    // This is a shortcut to invoking if a nextBatch update if any of the bottom elements have
    // been viewed or were present within the viewport. If this condition passes, all previous element
    // 'viewed' values are set to true to avoid future fallthrough.
    // See https://github.com/Maria-Mirage/mozaika/issues/34 for more info.
    if (bottomElements.some((element) => element === 'true')) {
      // set every 'viewed' attribute of gallery children elements to true and attempt to load next
      // data batch.
      this.getChildren().forEach((child) => {
        child.setAttribute('data-viewed', 'true');
      });

      if (viewed.length === this.props.data.length) {
        this.setState({ maxElementsReached: true });
      } else {
        this.setState(
          this.updateGalleryWith(this.props.data.slice(0, this.state.data.length + this.props.loadBatchSize))
        );
      }
    }
  }

  render() {
    const { children, Element, backgroundColour, loaderStrokeColour, ElementProps } = this.props;
    const { data, loading, totalHeight, computedStyles, maxElementsReached } = this.state;

    return (
      <div style={{ background: backgroundColour }}>
        <div
          {...(this.props.id && { id: this.props.id })}
          style={{
            height: loading || totalHeight === 0 ? '100% !important' : totalHeight,
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
              <Element
                {...ElementProps}
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
        {loading && <Loader strokeColour={loaderStrokeColour} />}
        <div style={{ display: maxElementsReached && !loading ? 'block' : 'none' }}>{children}</div>
      </div>
    );
  }
}
