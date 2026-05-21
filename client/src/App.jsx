
import React, { useState, useEffect, Children, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Tree } from "react-arborist";
import { FolderIcon, TvMinimalIcon, ChevronRight, ChevronDown, SaveIcon, FolderOpenIcon } from "lucide-react"; // Or any icon library

import './App.css';
import SSHConsole from "./SSHConsole";
import NetworkConfig from "./NetworkConfig";
import ServerPreview from "./ServerPreview"


export default function App() {

  const [showSSH, setShowSSH] = useState(false);
  const [showNetworkConfig, setShowNetworkConfig] = useState(false);
  const [selectedType, setSelectedType] = useState("none");
  const [selectedId, setSelectedId] = useState(null);
  const [sshUser, setSshUser] = useState("openplayback");
  const [sshPassword, setSshPassword] = useState("openplayback");
  const newData = {id: 1, name: "Multiviewer", type: "mvw"}
  const [groups, setGroups] = useState([newData]);
  const [serverName, setServerName] = useState("");
  const [serverAddr, setServerAddr] = useState("");
  const [serverColor, setServerColor] = useState("white");
  const [liveMode, setLiveMode] = useState("livestream");
  const [streamUrl, setStreamUrl] = useState("");
  const [webpageUrl, setWebpageUrl] = useState("");
  const [localFile, setLocalFile] = useState(null);
  const [isGoingLive, setIsGoingLive] = useState(false);

  const selectedServer = getSelectedServer();
  
  // Only update the Server Properties fields when the Selected Server ID changes
  // This allows you to actually edit what is being written into the text boxes, otherwise it resets constantly.
  useEffect(() => {
      if (selectedType === "server" && selectedId) {
        // Find the selected server
        let found = null;
        for (const item of groups) {
          if (item.type === "server" && item.id === selectedId) found = item;
          if (item.type === "group" && item.children) {
            const child = item.children.find(child => child.id === selectedId);
            if (child) found = child;
          }
        }
        if (found) {
          setServerName(found.name || "");
          setServerAddr(found.addr || "");
          setServerColor(found.color || "white");
          setSshUser(found.sshUser || "");
          setSshPassword(found.sshPassword || "");
        }
      }

    }, [selectedType, selectedId, groups]);

  // Save the current project to JSON
  async function saveProject() {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: "project.json",
        types: [
          {
            description: "JSON Files",
            accept: {
              "application/json": [".json"],
            },
          },
        ],
      });
      const writable = await fileHandle.createWritable();
      const jsonString = JSON.stringify(groups, null, 2);
      await writable.write(jsonString);
      await writable.close();
      console.log("Project saved successfully.");
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Save failed:", err);
        alert("Failed to save project.");
    }
  }
  }

  // Load a JSON file into the app
  function loadProject() {
    // Create hidden file input
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";

    input.onchange = (event) => {
      const file = event.target.files[0];

      if (!file) return;

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          // Parse JSON text into JS object/array
          const parsedData = JSON.parse(e.target.result);

          // Replace groups with loaded project
          setGroups(parsedData);

          // Reset selection
          setSelectedId(null);
          setSelectedType("none");

          console.log("Project loaded:", parsedData);

        } catch (err) {
          console.error("Invalid JSON file:", err);
          alert("Failed to load project. Invalid JSON.");
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  // Listen for CTRL+O and CTRL+S and run Open/Save project functions
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault(); // Prevent browser save page dialog
        saveProject();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
        event.preventDefault(); // Prevent browser save page dialog
        loadProject();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [groups]);

  // Helper function to upload file to server and WAIT for completion
  async function uploadMedia(file) {
    if (!file) {
      alert("No file selected");
      return;
    }
    const servers = getCheckedServers();
    for (const server of servers) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const response = await fetch(
          `http://${server.addr}/upload-media/${encodeURIComponent(file.name)}`,
          {
            method: "POST",
            body: formData,
          }
        );
        const data = await response.json();
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }
  }

  // Start a timer for 1s and turn on and off the Go Live button animation
  function triggerGoLiveAnimation() {
    setIsGoingLive(true);

    setTimeout(() => {
      setIsGoingLive(false);
    }, 1000);
  }

  function toggleGroupChecked(groupId, checked) {
    setGroups(prevGroups =>
      prevGroups.map(item => {
        if (item.id === groupId && item.type === "group") {
          return {
            ...item,
            checked,
            children: item.children.map(child => ({
              ...child,
              checked
            }))
          };
        }

        return item;
      })
    );
  }

  function toggleServerChecked(serverId, checked) {
    setGroups(prevGroups =>
      prevGroups.map(item => {

        // Root-level server
        if (item.type === "server" && item.id === serverId) {
          return {
            ...item,
            checked
          };
        }

        // Group children
        if (item.type === "group") {

          const updatedChildren = item.children.map(child => {
            if (child.id === serverId) {
              return {
                ...child,
                checked
              };
            }

            return child;
          });

          return {
            ...item,
            children: updatedChildren,
            checked: updatedChildren.every(child => child.checked)
          };
        }

        return item;
      })
    );
  }

  function isGroupFullyChecked(group) {
    if (!group.children?.length) return false;

    return group.children.every(child => child.checked);
  }

  function isGroupPartiallyChecked(group) {
    if (!group.children?.length) return false;

    const checkedCount = group.children.filter(
      child => child.checked
    ).length;

    return checkedCount > 0 && checkedCount < group.children.length;
  }

  function Node({ node, style, dragHandle }) {

    const checkboxRef = React.useRef(null);

    useEffect(() => {

      if (
        checkboxRef.current &&
        node.data.type === "group"
      ) {
        checkboxRef.current.indeterminate =
          isGroupPartiallyChecked(node.data);
      }

    }, [node.data]);

    const handleCheckboxChange = (e) => {

      const checked = e.target.checked;

      e.stopPropagation();

      if (node.data.type === "group") {
        toggleGroupChecked(node.data.id, checked);
      }

      if (node.data.type === "server") {
        toggleServerChecked(node.data.id, checked);
      }
    };

    return (
      <div
        style={style}
        ref={dragHandle}
        className={`node-container ${
          node.state.isSelected ? "isSelected" : ""
        }`}
      >

        

        {!node.isLeaf && (
          <span onClick={() => node.toggle()}>
            {node.isOpen
              ? <ChevronDown size={14} />
              : <ChevronRight size={14} />
            }
          </span>
        )}

        <span>
          {node.isLeaf
            ? <TvMinimalIcon size={14} color={node.data.color} />
            : <FolderIcon size={14} color={node.data.color} />
          }
        </span>

        <span className="node-label">
          {node.data.name}
        </span>

        <div className="node-spacer" />

        {node.data.type !== "mvw" && (
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={
              node.data.type === "group"
                ? isGroupFullyChecked(node.data)
                : node.data.checked || false
            }
            onChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    );
  }

  function getCheckedServers() {
    const checkedServers = [];

    for (const item of groups) {

      // Root server
      if (
        item.type === "server" &&
        item.checked
      ) {
        checkedServers.push(item);
      }

      // Group children
      if (item.type === "group") {
        item.children.forEach(child => {
          if (child.checked) {
            checkedServers.push(child);
          }
        });
      }
    }

    return checkedServers;
  }

  const ServerTree = React.memo(function ServerTree() {
    // Add Group handler
    const handleAddGroup = () => {
      setGroups([
        ...groups,
        { id: crypto.randomUUID(), name: `New Group`, type: "group", children: [], color: "white", checked: false }
      ]);
    };

    const handleAddServer = () => {
      setGroups([
        ...groups,
        { id: crypto.randomUUID(), name: `New Server`, type: "server", addr: "No IP", color: "white", sshUser: "openplayback", sshPassword: "openplayback", checked: false }
      ]);
    };

    const handleDeleteItem = () => {
      if (!selectedId) return;

    const updatedGroups = groups
      // Remove selected root-level item
      .filter(item => item.id !== selectedId)
      // Remove selected child items inside groups
      .map(item => {
        if (item.type === "group") {
          return {
            ...item,
            children: item.children.filter(
              child => child.id !== selectedId
            )
          };
        }
      return item;
      });

      setGroups(updatedGroups);

      setSelectedId(null);
      setSelectedType("none");

    };

    // Handle move event from Tree
    const handleMove = ( {dragIds, parentId, index} ) => {
      // Only one item is dragged at a time
      const dragId = dragIds[0];
      let draggedServer = null;
      let newGroups = groups.map(group => {
        if (group.type === "group") {
          const idx = group.children.findIndex(child => child.id === dragId);
          if (idx !== -1) {
            // Remove from this group
            draggedServer = group.children[idx];
            return {
              ...group,
              children: group.children.filter(child => child.id !== dragId)
            };
          }
        }
        return group;
      });

      // Also check if it's at root
      if (!draggedServer) {
        const idx = newGroups.findIndex(item => item.id === dragId);

        if (idx !== -1) {
          draggedServer = newGroups[idx];
          newGroups = newGroups.filter(item => item.id !== dragId);
        }
      }

      if (!draggedServer) return; // nothing to move

      if (parentId == null) {
        // Move to root at index
        const before = newGroups.slice(0, index);
        const after = newGroups.slice(index);
        setGroups([...before, draggedServer, ...after]);
      } else {
          // Prevent groups from being nested
          if (draggedServer.type === "group") {
            return;
          }

        // Move into a group
        setGroups(newGroups.map(group => {
          if (group.id === parentId && group.type === "group") {
            const before = group.children.slice(0, index);
            const after = group.children.slice(index);
            return {
              ...group,
              children: [...before, draggedServer, ...after]
            };
          }
          return group;
        }));
      }
    };

    return (
      <div>
        <button className='loadsavebtn slist' onClick={handleAddGroup}>Add Group</button>
        <button className='loadsavebtn slist' onClick={handleAddServer}>Add Server</button>
        <button className='loadsavebtn slist' onClick={handleDeleteItem}>Delete Item</button>
        <Tree className='server-tree'
          data={groups}
          selection={selectedId}
          openByDefault={true}
          indent={24}
          rowHeight={30}
          onMove={handleMove}
          onSelect={(nodes) => {
            setSelectedId(nodes[0]?.id ?? null);

            if (nodes.length !== 0) {
              setSelectedType(nodes[0].data.type);

              if (selectedType === "group") {
                document.getElementById('groupname').value = nodes[0].data.name
                document.getElementById('groupcolor').value = nodes[0].data.color
              }



            } else {
              setSelectedType("none");
            }
          }}
        >
          {Node}
        </Tree>
        
      </div>
    );
  });

  function applyGroupProps() {
    setGroups(prevGroups =>
      prevGroups.map(item => {
        if (item.type === "group" && item.id === selectedId) {
          return {
            ...item,
            name: document.getElementById("groupname").value,
            color: document.getElementById("groupcolor").value,
          };
        }
        return item;
      })
    );
  }

  function applyServerProps() {
    setGroups(prevGroups =>
      prevGroups.map(item => {
        // Root-level server
        if (item.type === "server" && item.id === selectedId) {
          return {
            ...item,
            name: serverName,
            color: serverColor,
            addr: serverAddr,
            sshUser,
            sshPassword,
          };
        }
        // Nested server inside group
        if (item.type === "group") {
          return {
            ...item,
            children: item.children.map(child => {
              if (child.id === selectedId) {
                return {
                  ...child,
                  name: serverName,
                  color: serverColor,
                  addr: serverAddr,
                };
              }
              return child;
            })
          };
        }
        return item;
      })
    );

  }

function getSelectedServer() {
  for (const item of groups) {

    // Root-level server
    if (item.type === "server" && item.id === selectedId) {
      return item;
    }

    // Server inside a group
    if (item.type === "group") {
      const found = item.children.find(
        child => child.id === selectedId
      );

      if (found) {
        return found;
      }
    }
  }

  return null;
}

  function serverCommand(cmd) {
    const servers = getCheckedServers();

    servers.forEach(server => {
      fetch(`http://${server.addr}/${cmd}`);
    });
  }

  async function goLive() {
    // const servers = getCheckedServers();
    switch (liveMode) {

      case "livestream":
        serverCommand(`/play/stream/${streamUrl.replaceAll('/', '*')}`)
        break;

      case "localfile":
        if (!localFile) {
          alert("Please select a file");
          return;
        }
        await uploadMedia(localFile);
        serverCommand(`/play/file/${localFile.name}`);
        break;

      case "webpage":
        serverCommand(`/play/web/${webpageUrl.replaceAll('/', '*')}`)
        break;

      case "blank":
        serverCommand('/blank')
        break;
    }
  }
  
  return (
    <div className="container">
      <div className="header">
        <img className='logo' src="./logo-color.png" alt="Logo" />
        <h1 className='title'>OpenPlayback Client</h1>
        <div className='menuicons'>
          <button onClick={() => saveProject()} className='loadsavebtn'><SaveIcon size={40} /></button>
          <button onClick={() => loadProject()} className='loadsavebtn'><FolderOpenIcon size={40} /></button>
        </div>
      </div>

      <div className='main-content'>
        <div className='right-container'>
          <h3 className='server-title'>Server List</h3>
          <ServerTree />
          
          <p className='server-reminder'>Use checkboxes to select servers to control.</p>
        </div>
        <div className='left-content'>
        <div className='topleft-container'>
          
          {selectedType === "server" && (
            <div className='topleft-container'>
              <div className='properties-server'>
                <div className='properties-header-div'>
                  <h3 className='properties-header'>Server Properties</h3>
                  <button className='properties-header-apply loadsavebtn' onClick={() => applyServerProps()}>Apply</button>
                </div>

                <div className='properties-list-item'>
                  <p className='properties-label'>Server Name</p>
                  <input
                    className='properties-input'
                    type="text"
                    placeholder='Server 01'
                    value={serverName}
                    onChange={e => setServerName(e.target.value)}
                  />
                </div>

                <div className='properties-list-item'>
                  <p className='properties-label'>Server Address</p>
                  <input
                    className='properties-input'
                    type="text"
                    placeholder='pb1.local:5000'
                    value={serverAddr}
                    onChange={e => setServerAddr(e.target.value)}
                  />
                </div>

                <div className='properties-list-item'>
                  <p className='properties-label'>Icon Color</p>
                  <select
                    className='properties-input select'
                    value={serverColor}
                    onChange={e => setServerColor(e.target.value)}
                  >
                    <option value="white">White</option>
                    <option value="red">Red</option>
                    <option value="green">Green</option>
                    <option value="blue">Blue</option>
                    <option value="orange">Orange</option>
                    <option value="pink">Pink</option>
                  </select>
                </div>

                <div className='properties-list-item'>
                  <p className='properties-label'>SSH User/Password</p>
                  <input
                    className='properties-input smaller'
                    type="text"
                    placeholder='openplayback'
                    value={sshUser}
                    onChange={e => setSshUser(e.target.value)}
                  />
                  <input
                    className='properties-input smaller'
                    type="text"
                    placeholder='openplayback'
                    value={sshPassword}
                    onChange={e => setSshPassword(e.target.value)}
                  />
                </div>

                <div className='properties-list-item'>
                  <p className='properties-label'>Remote Control</p>
                  <div className='spacer'></div>
                  <button className='loadsavebtn propsbtn' onClick={() => setShowNetworkConfig(true)}>Configure Network</button>
                  <button className='loadsavebtn propsbtn' onClick={() => setShowSSH(true)}>SSH</button>
                </div>

                <div className='properties-list-item'>
                  <p className='properties-label'>Administration</p>
                  <div className='spacer'></div>
                  <button className='loadsavebtn propsbtn' onClick={() => {serverCommand('reboot')}}>Reboot System</button>
                  <button className='loadsavebtn propsbtn' onClick={() => {serverCommand('restart-ffmpeg')}}>Restart FFMPEG</button>
                </div>
              </div>

              <div className='server-preview'>
                <h3 className='preview-header'>Output Preview</h3>
                {/* <img className='server-preview-img' src={screenshotUrl} key={imageKey} alt="Server Image" /> */}
                {/* <img className='server-preview-img' src={screenshotUrl} alt="Server Image" /> */}
                <ServerPreview selectedServer={selectedServer} />
              </div>
            </div>
          )}

          {selectedType === "group" && (
            <div className='topleft-container'>
              <div className='properties-server'>
                <div className='properties-header-div'>
                  <h3 className='properties-header'>Group Properties</h3>
                  <button className='properties-header-apply loadsavebtn' onClick={() => applyGroupProps()} >Apply</button>
                </div>

                <div className='properties-list-item'>
                  <p className='properties-label'>Group Name</p>
                  <input id='groupname' className='properties-input' type="text" placeholder='Group Name' />
                </div>

                <div className='properties-list-item'>
                  <p className='properties-label'>Icon Color</p>
                  <select id='groupcolor' className='properties-input select'>
                    <option value="white">White</option>
                    <option value="red">Red</option>
                    <option value="green">Green</option>
                    <option value="blue">Blue</option>
                    <option value="orange">Orange</option>
                    <option value="pink">Pink</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          

          
        </div>
        <div className='bottomleft-container'>
          <div className='livecontrol'>
            <h3 className='properties-header'>Live Control</h3>

            {/* PLAY LIVESTREAM */}
            <div
              className={`livecontrol-section ${liveMode === "livestream" ? "active" : ""}`}
              onClick={() => setLiveMode("livestream")}
            >

              <div className='livecontrol-radio-row'>
                <input
                  type="radio"
                  name="livemode"
                  checked={liveMode === "livestream"}
                />

                <p className='properties-label'>
                  Play Livestream
                </p>
                
                <input
                  className='properties-input'
                  type="text"
                  placeholder='rtmp://example.com/live'
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                />
              </div>


            </div>

            {/* PLAY LOCAL FILE */}
            <div
            className={`livecontrol-section ${liveMode === "localfile" ? "active" : ""}`}
            onClick={() => setLiveMode("localfile")}
            >

              <div className='livecontrol-radio-row'>
                <input
                  type="radio"
                  name="livemode"
                  checked={liveMode === "localfile"}
                />

                <p className='properties-label'>
                  Play Local File
                </p>

                <input
                  className='properties-input'
                  type="file"
                  onChange={(e) => {
                    setLocalFile(e.target.files[0]);
                  }}
                />
              </div>
            </div>

            {/* PLAY WEBPAGE */}
            <div
              className={`livecontrol-section ${liveMode === "webpage" ? "active" : ""}`}
              onClick={() => setLiveMode("webpage")}
            >

              <div className='livecontrol-radio-row'>
                <input
                  type="radio"
                  name="livemode"
                  checked={liveMode === "webpage"}
                />

                <p className='properties-label'>
                  Show Webpage
                </p>
                
                <input
                  className='properties-input'
                  type="text"
                  placeholder='https://example.com'
                  value={webpageUrl}
                  onChange={(e) => setWebpageUrl(e.target.value)}
                />
              </div>


            </div>

            {/* BLANK SCREEN */}
            <div
              className={`livecontrol-section ${liveMode === "blank" ? "active" : ""}`}
              onClick={() => setLiveMode("blank")}
            >

              <div className='livecontrol-radio-row'>
                <input
                  type="radio"
                  name="livemode"
                  checked={liveMode === "blank"}
                />

                <p className='properties-label'>
                  Blank Screen
                </p>
              </div>

            </div>

            <button
              className={`loadsavebtn livecontrol-go ${
                isGoingLive ? "live-active" : ""
              }`}
              onClick={() => {
                triggerGoLiveAnimation();
                console.log("GO LIVE:", liveMode);
                goLive();
              }}
            >
              GO LIVE
            </button>

          </div>



          {/* <button onClick={() => serverCommand('/play/stream/rtmp:**127.0.0.1*mrt')} className='control-btn'>test</button>
          <button onClick={() => serverCommand('/kill')} className='control-btn'>kill</button> */}
        </div>
        </div>
      </div>

      {showSSH && selectedServer && (
        <SSHConsole
          host={selectedServer.addr}
          username={selectedServer.sshUser}
          password={selectedServer.sshPassword}
          onClose={() => setShowSSH(false)}
        />
      )}
      {showNetworkConfig && selectedServer && (
        <NetworkConfig
          server={selectedServer}
          onClose={() => setShowNetworkConfig(false)}
        />
      )}
    </div>
  );
}
