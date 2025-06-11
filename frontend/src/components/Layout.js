import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faCogs, faDatabase, faLayerGroup, faRobot, faPlug } from '@fortawesome/free-solid-svg-icons';
import './Layout.css';
import { usePluginContext } from '../components/PluginContext';


const Layout = ({ children }) => {
  const { sideBarItems } = usePluginContext();

  return (
    <div className="App">
      <div className="sidebar">
        <nav>
          <ul>
            <li><Link to="/"><FontAwesomeIcon icon={faHome} /><span>Home</span></Link></li>
            <li><Link to="/process"><FontAwesomeIcon icon={faCogs} /><span>Process</span></Link></li>
            <li><Link to="/datanode"><FontAwesomeIcon icon={faDatabase} /><span>Data</span></Link></li>
            <li><Link to="/groupnode"><FontAwesomeIcon icon={faLayerGroup} /><span>Group</span></Link></li>
            <li><Link to="/daemon"><FontAwesomeIcon icon={faRobot} /><span>Daemon</span></Link></li>
            {Object.entries(sideBarItems).map(([name, item]) => (
              <li key={name}>
                <Link to={item.path}>
                  {item.icon ? <FontAwesomeIcon icon={item.icon} /> : null}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
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
