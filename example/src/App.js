import React, { useEffect, useState } from 'react';

import Mozaika from 'mozaika';
import 'mozaika/dist/index.css';
import ExplorerElement from './components/ExplorerElement';

export const API = 'https://api.mariamiragephotography.com';

function getData() {
  return fetch(`${API}/photo?theme=*`)
    .then(response => (response.json()))
    .then(response => {
      if (!response.status) throw new Error('Failed to load data.');

      let currentIndex = response.data.length, temporaryValue, randomIndex;

      while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = response.data[currentIndex];
        response.data[currentIndex] = response.data[randomIndex];
        response.data[randomIndex] = temporaryValue;
      }

      return response.data;
    }).catch((e) => {
      return { error: e };
    });
}

const App = () => {
  const [data, setData] = useState([]);
  const [sidebarWidth, setSidebarWidth] = useState(0);

  useEffect(() => {
    getData().then((result) => {
      setData(result);
    });

  }, []);

  const toggleSidebar = () => {
    setSidebarWidth(sidebarWidth > 0 ? 0 : 240);
  };

  if (data.length === 0) return '';
  else {
    return (
      <div>
        <div className={'sidebar'} style={{ width: sidebarWidth, height: '100%' }}>
          sidebar
        </div>
        <div className={'main'} style={{ width: `calc(100% - ${sidebarWidth})`, marginLeft: sidebarWidth }}>
          <button onClick={toggleSidebar}>open</button>
          <Mozaika data={data} onLayout={(update) => {
            //console.log('I got an update!');
            //console.log(update);
          }
          } Element={ExplorerElement}/>
        </div>
      </div>
    );
  }
};

export default App;
