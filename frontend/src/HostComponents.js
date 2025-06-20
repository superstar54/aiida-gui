
import NodeTable from './components/NodeTable';
import WorkFlowItem from './components/WorkFlowItem';
import { extraProcessActions } from './components/ProcessTable'; // the generic table

// Any host-provided components available for plugins
const hostComponents = {
NodeTable,
WorkFlowItem,
extraProcessActions,
// Add any other host components you want to provide to plugins
};

export default hostComponents;
