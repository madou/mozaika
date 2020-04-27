import React from 'react'
import styles from './Loader.module.css'

/**
 * Module description:   /Loader.js
 *
 * Created on 16/09/2019
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

const Loader = React.memo(function Loader() {
  return (
    <div className={styles.spinner}>
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
    </div>
  )
})

export default Loader
