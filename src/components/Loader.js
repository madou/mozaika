/**
 * Module description:   /Loader.js
 *
 * Created on 16/09/2019
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import React from 'react'
import { styled } from '@compiled/css-in-js'

const Div = styled.div`
  width: 100%;
  display: block;
  padding: 2em 0;
  background: #0f0f10;
  text-align: center;

  svg {
    animation: rotate 2s linear infinite;
    z-index: 2;
    margin: auto;
    width: 50px;
    height: 50px;
  }

  circle {
    stroke: hsl(0, 100%, 100%);
    stroke-linecap: round;
    animation: dash 1.5s ease-in-out infinite;
  }

  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes dash {
    0% {
      stroke-dasharray: 1, 150;
      stroke-dashoffset: 0;
    }
    50% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -35;
    }
    100% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -124;
    }
  }
`

const Loader = React.memo(function Loader() {
  return (
    <Div>
      <svg viewBox='0 0 50 50'>
        <circle
          className='path'
          cx='25'
          cy='25'
          r='20'
          fill='none'
          strokeWidth='5'
        />
      </svg>
    </Div>
  )
})

export default Loader
