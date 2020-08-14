import React, { useEffect, useState } from "react";


import Mozaika from "mozaika";
import "mozaika/dist/index.css";
import ExplorerElement from "./components/ExplorerElement";

export const DEV_API = "https://5uxeooen15.execute-api.eu-west-2.amazonaws.com/dev";
export const API = "https://api.mariamiragephotography.com";

function getData(from) {
  return fetch(`${DEV_API}/photo?limit=100`  + (from !== null ? `&from=${from}` : ''))
    .then(response => (response.json()))
    .then(response => {
      if (!response.status) throw new Error("Failed to load data.");

      return response;
    }).catch((e) => {
      return { error: e };
    });
}

const App = () => {
  const [data, setData] = useState([]);
  const [from, setFrom] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(0);

  useEffect(() => {
    getData(null).then((result) => {
      setData(result.data);
      setFrom(result.from);
    });

  }, []);

  const toggleSidebar = () => {
    setSidebarWidth(sidebarWidth > 0 ? 0 : 240);
  };


  return (
    <div>
      <div className={"sidebar"} style={{ width: sidebarWidth, height: "100%" }}>
        sidebar
      </div>
      <div className={"main"} style={{ width: `calc(100% - ${sidebarWidth})`, marginLeft: sidebarWidth }}>
        <button onClick={toggleSidebar}>open</button>
        <Mozaika
          data={data}
          streamMode
          onNextBatch={() => {
            if (from === null) return false;

            return getData(from).then((result) => {
              setData([...data, ...result.data]);
              setFrom(result.from)

              return result.from !== null;
            });
          }}
          onLayout={(update) => {
            console.log("I got an update!");
            console.log(update);
          }}
          Element={ExplorerElement}/>
      </div>
    </div>
  );
};

export default App;
