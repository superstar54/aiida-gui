// src/components/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faProjectDiagram, faCogs, faDatabase, faLayerGroup, faRobot, faClock, faPlug } from '@fortawesome/free-solid-svg-icons';
import './Layout.css'; // Import layout-specific styles

const Layout = ({ children, pluginNames = [] }) => {
  return (
    <div className="App">
      <div className="sidebar">
        <nav>
          <ul>
          <li><Link to="/"><FontAwesomeIcon icon={faHome} /><span>Home</span></Link></li>
          <li><Link to="/workgraph"><FontAwesomeIcon icon={faProjectDiagram} /><span>WorkGraph</span></Link></li>
          <li><Link to="/process"><FontAwesomeIcon icon={faCogs} /><span>Process</span></Link></li>
          <li><Link to="/datanode"><FontAwesomeIcon icon={faDatabase} /><span>Data</span></Link></li>
          <li><Link to="/groupnode"><FontAwesomeIcon icon={faLayerGroup} /><span>Group</span></Link></li>
          <li><Link to="/daemon"><FontAwesomeIcon icon={faRobot} /><span>Daemon</span></Link></li>
          <li><Link to="/scheduler"><FontAwesomeIcon icon={faClock} /><span>Scheduler</span></Link></li>
          {/* --- Plugins Section --- */}
          {pluginNames.length > 0 && (
            <>
              <li className="sidebar-section-header">
                <FontAwesomeIcon icon={faPlug} />
                <span>Plugins</span>
              </li>
              {pluginNames.map((name) => (
                <li key={name}>
                  <Link to={`/${name}`}>
                    <FontAwesomeIcon icon={faPlug} />
                    <span style={{ textTransform: 'capitalize' }}>
                      {name}
                    </span>
                  </Link>
                </li>
              ))}
            </>
           )}
          </ul>
        </nav>
      </div>
      <div className="content">
        {children} {/* This is where page-specific content will be rendered */}
      </div>
    </div>
  );
};

export default Layout;
