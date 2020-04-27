# mozaika

> A React component which organises an arbitrary number of elements into a neat grid.

[![NPM](https://img.shields.io/npm/v/mozaika.svg)](https://www.npmjs.com/package/@feds01/mozaika) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save @feds01/mozaika
```

## Usage

```jsx
import React, { Component } from 'react'

import Mozaika from 'mozaika';
import ChildContainer from './../components/ChildContainer';

class Example extends Component {
  render() {
    const {data} = this.state;

    return <Mozaika data={data} ExplorerElement={ChildContainer} />
  }
}
```

## License

MIT © [feds01](https://github.com/feds01)
