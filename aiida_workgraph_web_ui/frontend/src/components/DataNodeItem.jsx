// File: src/components/DataNodeItem.jsx

import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import AtomsItem from './AtomsItem';
import { PluginContext } from '../PluginContext'; // ← import our context

import './DataNodeItem.css';
import '../App.css';

function DataNodeItem() {
  const { pk } = useParams();
  const [NodeData, setNodeData] = useState({ node_type: "" });

  // 1) Grab the merged dataViews mapping from PluginContext:
  const { dataViews } = useContext(PluginContext);

  useEffect(() => {
    fetch(`http://localhost:8000/api/datanode/${pk}`)
      .then((response) => response.json())
      .then((data) => {
        setNodeData(data);
      })
      .catch((error) => console.error('Error fetching data:', error));
  }, [pk]);

  // Safe stringify helper
  const stringifyValue = (value) => {
    if (value === null) return 'null';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  // 2) Check if there is a plugin‐provided viewer for this node_type:
  const ViewerComponent = dataViews[NodeData.node_type] || null;

  return (
    <div className="table-container">
      <h2>DataNode</h2>

      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(NodeData).map(([key, value]) => (
            key !== "extras" && (
              <tr key={key}>
                <td>{key}</td>
                <td style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {stringifyValue(value)}
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>

      {/*
        3) If node_type is StructureData/TrajectoryData/etc., render AtomsItem:
        (you can keep those as‐before)
      */}
      {NodeData.node_type === 'data.core.structure.StructureData.' && (
        <AtomsItem data={NodeData} />
      )}
      {NodeData.node_type === 'data.core.array.trajectory.TrajectoryData.' && (
        <AtomsItem data={NodeData} />
      )}
      {NodeData.node_type === 'data.workgraph.ase.atoms.Atoms.AtomsData.' && (
        <AtomsItem data={NodeData} />
      )}

      {/*
        4) If a plugin has registered a dataView for this node_type, render it here.
        ViewerComponent will be undefined if no plugin mapped that node_type.
      */}
      {ViewerComponent && <ViewerComponent data={NodeData} />}
    </div>
  );
}

export default DataNodeItem;
