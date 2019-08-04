import { DiagramEngine, LinkLayerFactory, NodeLayerFactory } from '@projectstorm/react-diagrams-core';
import {
	DefaultLabelFactory,
	DefaultLinkFactory,
	DefaultNodeFactory,
	DefaultPortFactory
} from '@projectstorm/react-diagrams-defaults';
import { PathFindingLinkFactory } from '@projectstorm/react-diagrams-routing';
import { DefaultState, SelectionBoxLayerFactory } from '@projectstorm/react-canvas-core';

export * from '@projectstorm/react-diagrams-core';
export * from '@projectstorm/react-diagrams-defaults';
export * from '@projectstorm/react-diagrams-routing';

/**
 * Construct an engine with the defaults installed
 */
export default (): DiagramEngine => {
	const engine = new DiagramEngine();

	// register model factories
	engine.getLayerFactories().registerFactory(new NodeLayerFactory());
	engine.getLayerFactories().registerFactory(new LinkLayerFactory());
	engine.getLayerFactories().registerFactory(new SelectionBoxLayerFactory());

	engine.getLabelFactories().registerFactory(new DefaultLabelFactory());
	engine.getNodeFactories().registerFactory(new DefaultNodeFactory()); // i cant figure out why
	engine.getLinkFactories().registerFactory(new DefaultLinkFactory());
	engine.getLinkFactories().registerFactory(new PathFindingLinkFactory());
	engine.getPortFactories().registerFactory(new DefaultPortFactory());

	// register the default interaction behaviours
	engine.getStateMachine().pushState(new DefaultState());
	return engine;
};
