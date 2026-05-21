import React, { useEffect, useState } from "react";

export default function NetworkConfig({
  server,
  onClose,
}) {

  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInterfaces();
  }, []);

  async function loadInterfaces() {
    try {
      const res = await fetch(
        `http://${server.addr}/configure/network/get-info`
      );
      const data = await res.json();
      setInterfaces(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load network interfaces");
    } finally {
      setLoading(false);
    }
  }

  function updateInterface(index, field, value) {
    setInterfaces(prev =>
      prev.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            [field]: value,
          };
        }
        return item;
      })
    );

  }

  async function applyInterface(iface) {
    try {
      const url =
        `http://${server.addr}/configure/network/set/${iface.interface}/${iface.address}/${iface.subnet}`;
      const res = await fetch(url, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to apply");
      }
      alert(`Applied settings to ${iface.interface}`);
    } catch (err) {
      console.error(err);
      alert("Failed to apply network settings");
    }
  }
    // async function applyInterface(iface) {
    // console.log(
    //     "Applying network config:",
    //     iface
    // );
    // alert(
    //     `Applied ${iface.interface}\nIP: ${iface.address}\nMask: ${iface.subnet}`
    // );
    // }

  return (
    <div
        style={{
            position: "fixed",

            top: "50%",
            left: "50%",

            transform: "translate(-50%, -50%)",

            width: "700px",

            maxHeight: "80vh",

            background: "#111",
            border: "1px solid #444",
            borderRadius: "10px",

            zIndex: 9999,

            overflow: "hidden",

            display: "flex",
            flexDirection: "column",
        }}
    >

      {/* HEADER */}
      <div
        style={{
          height: "40px",
          background: "#222",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          color: "white",
          flexShrink: 0,
        }}
      >
        <span>
          Network Configuration - {server.name}
        </span>

        <button
          onClick={onClose}
          style={{
            background: "red",
            color: "white",
            border: "none",
            padding: "5px 10px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>

      {/* CONTENT */}
      <div
        style={{
          padding: 20,
          overflowY: "auto",
          flexGrow: 1,
        }}
      >

        {loading && (
          <p style={{color: "white"}}>Loading interfaces...</p>
        )}

        {!loading && interfaces.length === 0 && (
          <p>No interfaces found.</p>
        )}

        {interfaces.map((iface, index) => (

          <div
            key={iface.interface}
            style={{
              border: "1px solid #333",
              borderRadius: 8,
              padding: 20,
              marginBottom: 20,
              background: "#1a1a1a",
            }}
          >

            <h3
              style={{
                marginTop: 0,
              }}
            >
              {iface.interface}
            </h3>

            <div
              style={{
                marginBottom: 15,
                marginRight: 10
              }}
            >
              <p style={{color: "white"}}>IPv4 Address</p>

              <input
                type="text"
                value={iface.address}
                onChange={(e) =>
                  updateInterface(
                    index,
                    "address",
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: 8,
                  background: "#222",
                  color: "white",
                  border: "1px solid #555",
                  borderRadius: 5,
                  paddingRight: 0,
                }}
              />
            </div>

            <div
              style={{
                marginBottom: 20,
                marginRight: 10
              }}
            >
              <p style={{color: "white"}}>Subnet Mask</p>

              <input
                type="text"
                value={iface.subnet}
                onChange={(e) =>
                  updateInterface(
                    index,
                    "subnet",
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: 8,
                  background: "#222",
                  color: "white",
                  border: "1px solid #555",
                  borderRadius: 5,
                  paddingRight: 0,
                }}
              />
            </div>

            <button
              onClick={() => applyInterface(iface)}
              style={{
                background: "#333",
                color: "white",
                border: "1px solid #666",
                padding: "10px 20px",
                borderRadius: 5,
                cursor: "pointer",
              }}
            >
              Apply
            </button>

          </div>

        ))}

      </div>
    </div>
  );

}