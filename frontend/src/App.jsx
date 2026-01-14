import { useEffect, useMemo, useRef, useState } from "react";
import { apiGetAnnotations, apiCreateAnnotation, apiDeleteAnnotation } from "./api";

const STORAGE_KEY = "pc_annotations_v1";

function bytesUtf8(str) {
  return new TextEncoder().encode(str).length;
}

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveToStorage(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function App() {
  // data 
  const [annotations, setAnnotations] = useState([]);

  // refs 
  const viewerRef = useRef(null);
  const markerMapRef = useRef(new Map()); // id -> THREE.Mesh

  // derived 
  const formatted = useMemo(() => {
    return annotations
      .filter((a) => a?.position && typeof a.position.x === "number")
      .map((a) => ({
        ...a,
        posText: `${a.position.x.toFixed(3)}, ${a.position.y.toFixed(3)}, ${a.position.z.toFixed(3)}`,
      }));
  }, [annotations]);

  // helpers 
  function getMarkerRadius(viewer) {
    const THREE = window.THREE;
    try {
      const pc = viewer?.scene?.pointclouds?.[0];
      if (!pc?.boundingBox || !THREE) return 0.03;

      const size = pc.boundingBox.getSize(new THREE.Vector3());
      const diag = size.length();

      return Math.max(diag * 0.001, 0.02); 
    } catch {
      return 0.03;
    }
  }

  function addMarker(viewer, ann) {
    if (markerMapRef.current.has(ann.id)) return;

    const r = getMarkerRadius(viewer);

    const mesh = new window.THREE.Mesh(
      new window.THREE.SphereGeometry(r, 16, 16),
      new window.THREE.MeshBasicMaterial({
        color: 0xff0000,
        depthTest: false,
        depthWrite: false,
      })
    );

    mesh.position.set(ann.position.x, ann.position.y, ann.position.z + r * 0.25);
    viewer.scene.scene.add(mesh);

    markerMapRef.current.set(ann.id, mesh);
  }

  function removeMarker(id) {
    const mesh = markerMapRef.current.get(id);
    if (!mesh) return;

    viewerRef.current.scene.scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();

    markerMapRef.current.delete(id);
  }

  async function removeAnnotation(id) {
    try {
      await apiDeleteAnnotation(id);
    } catch (e) {
      console.error(e);
      alert("Failed to delete annotation");
      return;
    }

    removeMarker(id);
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }


  // init 
  useEffect(() => {
    if (window.__potree_inited) return;
    window.__potree_inited = true;

    const viewer = new window.Potree.Viewer(
      document.getElementById("potree_render_area")
    );
    viewerRef.current = viewer;

    viewer.setEDLEnabled(true);
    viewer.setPointBudget(1_000_000);
    viewer.setBackground("skybox");

    window.Potree.loadPointCloud(
      "/potree/pointclouds/lion_takanawa/cloud.js",
      "lion",
      (e) => {
        viewer.scene.addPointCloud(e.pointcloud);
        viewer.fitToScreen();

        // draw existing markers (from API)
        (async () => {
          try {
            const items = await apiGetAnnotations();
            const safeItems = (items || []).filter((a) => a?.id && a?.position && typeof a.position.x === "number");
            setAnnotations(safeItems);
            safeItems.forEach((ann) => addMarker(viewer, ann));
          } catch (e) {
            console.error(e);
            alert("Failed to load annotations from API");
          }
        })();

        const canvas = viewer.renderer.domElement;

        canvas.addEventListener("click", async (ev) => {
          const rect = canvas.getBoundingClientRect();
          const mouse = {
            x: ev.clientX - rect.left,
            y: ev.clientY - rect.top,
          };

          const hit = window.Potree.Utils.getMousePointCloudIntersection(
            mouse,
            viewer.scene.getActiveCamera(),
            viewer,
            viewer.scene.pointclouds
          );

          if (!hit?.location) return;

          const text = prompt("Annotation text (<=256 bytes):");
          if (!text) return;
          if (bytesUtf8(text) > 256) {
            alert("Text too long (max 256 bytes)");
            return;
          }

          const payload = {
            position: hit.location,
            text: text.trim(),
          };

          let created;
          try {
            created = await apiCreateAnnotation(payload);
          } catch (e) {
            console.error(e);
            alert("Failed to create annotation");
            return;
          }

          addMarker(viewer, created);

          setAnnotations((prev) => [created, ...prev]);
        });
      }
    );
  }, []);

  // UI 
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <div
        id="potree_render_area"
        style={{ width: "100%", height: "100%" }}
      />

      {/* overlay panel */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 340,
          maxHeight: "85vh",
          overflow: "auto",
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          padding: 12,
          borderRadius: 10,
          fontSize: 13,
          zIndex: 10,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Annotations ({annotations.length})
        </div>

        {formatted.map((a) => (
          <div
            key={a.id}
            style={{
              padding: 10,
              marginBottom: 10,
              borderRadius: 8,
              background: "rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ fontWeight: 700 }}>{a.text}</div>
            <div style={{ opacity: 0.85, marginTop: 4 }}>
              pos: {a.posText}
            </div>
            <div style={{ opacity: 0.7 }}>
              {new Date(a.createdAt).toLocaleString()}
            </div>

            <button
              onClick={() => removeAnnotation(a.id)}
              style={{
                marginTop: 6,
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.3)",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
