import React, { useEffect, useState } from "react";

import Mozaika from "@feds01/mozaika";
import ExplorerElement from "./components/ExplorerElement";

export const DEV_API = "https://5uxeooen15.execute-api.eu-west-2.amazonaws.com/dev";
export const API = "https://api.mariamiragephotography.com";

function getData(theme, from) {
  const encodedTheme = encodeURIComponent(theme);

  return fetch(`${DEV_API}/photo?limit=100&theme=${encodedTheme}`  + (from !== null ? `&from=${from}` : ''))
    .then(response => (response.json()))
    .then(response => {
      if (!response.status) throw new Error("Failed to load data.");

      return response;
    }).catch((e) => {
      return { error: e };
    });
}

const App = () => {
  const [theme, setTheme] = useState("Summer");
  const [data, setData] = useState([]);
  const [from, setFrom] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(0);

  useEffect(() => {
    getData(theme, null).then((result) => {
      setData(result.data);
      setFrom(result.from);
    });

  }, [theme]);

  const toggleSidebar = () => {
    setSidebarWidth(sidebarWidth > 0 ? 0 : 240);
  };


  return (
    <div>
      <div className={"sidebar"} style={{ width: sidebarWidth, height: "100%" }}>
        sidebar

        <button onClick={() => setTheme('Winter')}>winter theme</button>
        <button onClick={() => setTheme('Summer')}>summer theme</button>
      </div>
      <div className={"main"} style={{ width: `calc(100% - ${sidebarWidth})`, marginLeft: sidebarWidth }}>
        <button onClick={toggleSidebar}>open</button>
        <Mozaika
          data={data}
          streamMode
          resetStreamKey={theme}
          onNextBatch={() => {
            if (from === null) return false;

            return getData(from).then((result) => {
              setData([...data, ...result.data]);
              setFrom(result.from)

              return result.from !== null;
            });
          }}
          // onLayout={(update) => {
          //   console.log("I got an update!");
          //   console.log(update);
          // }}
          Element={ExplorerElement}/>
      </div>
    </div>
  );
};

export default App;
