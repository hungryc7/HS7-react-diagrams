import * as React from "react";
import * as _ from "lodash";
import * as PF from "pathfinding";
import * as Path from "paths-js/path";
import { DiagramEngine, ROUTING_SCALING_FACTOR } from "../DiagramEngine";
import { LinkModel } from "../models/LinkModel";
import { PointModel } from "../models/PointModel";
import { NodeModel } from "../models/NodeModel";

export interface DefaultLinkProps {
	color?: string;
	width?: number;
	smooth?: boolean;
	link: LinkModel;
	diagramEngine: DiagramEngine;
	pointAdded?: (point: PointModel, event: MouseEvent) => any;
}

export interface DefaultLinkState {
	selected: boolean;
}

const pathFinderInstance = new PF.JumpPointFinder({
	heuristic: PF.Heuristic.manhattan,
	diagonalMovement: PF.DiagonalMovement.Never
});

/**
 * @author Dylan Vorster
 */
export class DefaultLinkWidget extends React.Component<DefaultLinkProps, DefaultLinkState> {
	public static defaultProps: DefaultLinkProps = {
		color: "black",
		width: 3,
		link: null,
		engine: null,
		smooth: false,
		diagramEngine: null
	};

	// DOM references to the label and paths (if label is given), used to calculate dynamic positioning
	refLabel: HTMLElement;
	refPaths: SVGPathElement[];

	constructor(props: DefaultLinkProps) {
		super(props);
		this.state = {
			selected: false
		};
	}

	addPointToLink = (event: MouseEvent, index: number): void => {
		if (
			!event.shiftKey &&
			!this.props.diagramEngine.isModelLocked(this.props.link) &&
			this.props.link.points.length - 1 <= this.props.diagramEngine.getMaxNumberPointsPerLink()
		) {
			const point = new PointModel(this.props.link, this.props.diagramEngine.getRelativeMousePoint(event));
			point.setSelected(true);
			this.forceUpdate();
			this.props.link.addPoint(point, index);
			this.props.pointAdded(point, event);
		}
	};

	generatePoint(pointIndex: number): JSX.Element {
		let x = this.props.link.points[pointIndex].x;
		let y = this.props.link.points[pointIndex].y;

		return (
			<g key={"point-" + this.props.link.points[pointIndex].id}>
				<circle
					cx={x}
					cy={y}
					r={5}
					className={"point pointui" + (this.props.link.points[pointIndex].isSelected() ? " selected" : "")}
				/>
				<circle
					onMouseLeave={() => {
						this.setState({ selected: false });
					}}
					onMouseEnter={() => {
						this.setState({ selected: true });
					}}
					data-id={this.props.link.points[pointIndex].id}
					data-linkid={this.props.link.id}
					cx={x}
					cy={y}
					r={15}
					opacity={0}
					className={"point"}
				/>
			</g>
		);
	}

	generateLink(extraProps: any, id: string | number): JSX.Element {
		var props = this.props;

		var Bottom = (
			<path
				className={this.state.selected || this.props.link.isSelected() ? "selected" : ""}
				strokeWidth={props.width}
				stroke={props.color}
				ref={path => path && this.refPaths.push(path)}
				{...extraProps}
			/>
		);

		var Top = (
			<path
				strokeLinecap="round"
				onMouseLeave={() => {
					this.setState({ selected: false });
				}}
				onMouseEnter={() => {
					this.setState({ selected: true });
				}}
				data-linkid={this.props.link.getID()}
				stroke={props.color}
				strokeOpacity={this.state.selected ? 0.1 : 0}
				strokeWidth={20}
				onContextMenu={() => {
					if (!this.props.diagramEngine.isModelLocked(this.props.link)) {
						event.preventDefault();
						this.props.link.remove();
					}
				}}
				{...extraProps}
			/>
		);

		return (
			<g key={"link-" + id}>
				{Bottom}
				{Top}
			</g>
		);
	}

	generateLabel() {
		const canvas = this.props.diagramEngine.canvas as HTMLElement;
		return (
			<foreignObject className="link-label" width={canvas.offsetWidth} height={canvas.offsetHeight}>
				<div ref={label => (this.refLabel = label)}>{this.props.link.label}</div>
			</foreignObject>
		);
	}

	findPathAndRelativePositionToRenderLabel = (): {
		path: any;
		position: number;
	} => {
		// an array to hold all path lengths, making sure we hit the DOM only once to fetch this information
		const lengths = this.refPaths.map(path => path.getTotalLength());

		// calculate the point where we want to display the label
		let labelPosition = lengths.reduce((previousValue, currentValue) => previousValue + currentValue, 0) / 2;

		// find the path where the label will be rendered and calculate the relative position
		let pathIndex = 0;
		while (pathIndex < this.refPaths.length) {
			if (labelPosition - lengths[pathIndex] < 0) {
				return {
					path: this.refPaths[pathIndex],
					position: labelPosition
				};
			}

			// keep searching
			labelPosition -= lengths[pathIndex];
			pathIndex++;
		}
	};

	calculateLabelPosition = () => {
		if (!this.refLabel) {
			// no label? nothing to do here
			return;
		}

		const { path, position } = this.findPathAndRelativePositionToRenderLabel();

		const labelDimensions = {
			width: this.refLabel.offsetWidth,
			height: this.refLabel.offsetHeight
		};

		const pathCentre = path.getPointAtLength(position);

		const labelCoordinates = {
			x: pathCentre.x - labelDimensions.width / 2,
			y: pathCentre.y - labelDimensions.height / 2
		};

		this.refLabel.setAttribute("style", `transform: translate(${labelCoordinates.x}px, ${labelCoordinates.y}px);`);
	};

	componentDidUpdate() {
		window.requestAnimationFrame(this.calculateLabelPosition);
	}

	componentDidMount() {
		window.requestAnimationFrame(this.calculateLabelPosition);
	}

	generateLinePath(firstPoint: PointModel, lastPoint: PointModel): string {
		return `M${firstPoint.x},${firstPoint.y} L ${lastPoint.x},${lastPoint.y}`;
	}

	generateCurvePath(
		firstPoint: PointModel,
		lastPoint: PointModel,
		firstPointDelta: number = 0,
		lastPointDelta: number = 0
	): string {
		return `M${firstPoint.x},${firstPoint.y} C ${firstPoint.x + firstPointDelta},${firstPoint.y} ${lastPoint.x +
			lastPointDelta},${lastPoint.y} ${lastPoint.x},${lastPoint.y}`;
	}

	generateDynamicPath(pathCoords: number[][]) {
		let path = Path();
		path = path.moveto(pathCoords[0][0] * ROUTING_SCALING_FACTOR, pathCoords[0][1] * ROUTING_SCALING_FACTOR);
		pathCoords.slice(1).forEach(coords => {
			path = path.lineto(coords[0] * ROUTING_SCALING_FACTOR, coords[1] * ROUTING_SCALING_FACTOR);
		});
		return path.print();
	}

	calculateDirectPath(
		from: {
			x: number;
			y: number;
		},
		to: {
			x: number;
			y: number;
		}
	): number[][] {
		const { diagramEngine } = this.props;
		const matrix = diagramEngine.getCanvasMatrix();

		const grid = new PF.Grid(matrix);

		return pathFinderInstance.findPath(
			diagramEngine.translateRoutingX(Math.floor(from.x / ROUTING_SCALING_FACTOR)),
			diagramEngine.translateRoutingY(Math.floor(from.y / ROUTING_SCALING_FACTOR)),
			diagramEngine.translateRoutingX(Math.floor(to.x / ROUTING_SCALING_FACTOR)),
			diagramEngine.translateRoutingY(Math.floor(to.y / ROUTING_SCALING_FACTOR)),
			grid
		);
	}

	calculateLinkStartEndCoords(
		matrix: number[][],
		path: number[][]
	): {
		start: {
			x: number;
			y: number;
		};
		end: {
			x: number;
			y: number;
		};
		pathToStart: number[][];
		pathToEnd: number[][];
	} {
		const startIndex = path.findIndex(point => matrix[point[1]][point[0]] === 0);
		const pathToStart = path.slice(0, startIndex);
		const endIndex =
			path.length -
			path
				.slice()
				.reverse()
				.findIndex(point => matrix[point[1]][point[0]] === 0) -
			1;
		const pathToEnd = path.slice(endIndex);

		return {
			start: {
				x: path[startIndex][0],
				y: path[startIndex][1]
			},
			end: {
				x: path[endIndex][0],
				y: path[endIndex][1]
			},
			pathToStart,
			pathToEnd
		};
	}

	render() {
		const { diagramEngine } = this.props;
		if (!diagramEngine.nodesRendered) {
			return null;
		}

		//ensure id is present for all points on the path
		var points = this.props.link.points;

		var paths = [];
		let model = diagramEngine.getDiagramModel();

		if (diagramEngine.isSmartRoutingEnabled()) {
			// first step: calculate a direct path between the points being linked
			const directPathCoords = this.calculateDirectPath(_.first(points), _.last(points));

			const routingMatrix = diagramEngine.getRoutingMatrix();
			// now we need to extract, from the routing matrix, the very first walkable points
			// so they can be used as origin and destination of the link to be created
			const { start, end, pathToStart, pathToEnd } = this.calculateLinkStartEndCoords(
				routingMatrix,
				directPathCoords
			);

			// second step: calculate a path avoiding hitting other elements
			const grid = new PF.Grid(routingMatrix);
			const dynamicPath = pathFinderInstance.findPath(start.x, start.y, end.x, end.y, grid);

			// third step: aggregate everything to have the calculated path ready for render
			const pathCoords = pathToStart
				.concat(dynamicPath, pathToEnd)
				.map(coords => [
					diagramEngine.translateRoutingX(coords[0], true),
					diagramEngine.translateRoutingY(coords[1], true)
				]);
			// const svgPath = this.generateDynamicPath(PF.Util.smoothenPath(grid, pathCoords));
			const svgPath = this.generateDynamicPath(PF.Util.compressPath(pathCoords));

			paths.push(
				this.generateLink(
					{
						onMouseDown: event => {
							this.addPointToLink(event, 1);
						},
						d: svgPath
					},
					"0"
				)
			);
		} else if (points.length === 2) {
			//draw the smoothing
			//if the points are too close, just draw a straight line
			var margin = 50;
			if (Math.abs(points[0].x - points[1].x) < 50) {
				margin = 5;
			}

			var pointLeft = points[0];
			var pointRight = points[1];

			//some defensive programming to make sure the smoothing is
			//always in the right direction
			if (pointLeft.x > pointRight.x) {
				pointLeft = points[1];
				pointRight = points[0];
			}

			paths.push(
				this.generateLink(
					{
						onMouseDown: event => {
							this.addPointToLink(event, 1);
						},
						d: this.generateCurvePath(pointLeft, pointRight, margin, -margin)
					},
					"0"
				)
			);
			if (this.props.link.targetPort === null) {
				paths.push(this.generatePoint(1));
			}
		} else {
			//draw the multiple anchors and complex line instead
			var ds = [];
			if (this.props.smooth) {
				ds.push(this.generateCurvePath(points[0], points[1], 50, 0));
				for (var i = 1; i < points.length - 2; i++) {
					ds.push(this.generateLinePath(points[i], points[i + 1]));
				}
				ds.push(this.generateCurvePath(points[i], points[i + 1], 0, -50));
			} else {
				var ds = [];
				for (var i = 0; i < points.length - 1; i++) {
					ds.push(this.generateLinePath(points[i], points[i + 1]));
				}
			}

			paths = ds.map((data, index) => {
				return this.generateLink(
					{
						"data-linkid": this.props.link.id,
						"data-point": index,
						onMouseDown: (event: MouseEvent) => {
							this.addPointToLink(event, index + 1);
						},
						d: data
					},
					index
				);
			});

			//render the circles
			for (var i = 1; i < points.length - 1; i++) {
				paths.push(this.generatePoint(i));
			}

			if (this.props.link.targetPort === null) {
				paths.push(this.generatePoint(points.length - 1));
			}
		}

		// ensure we have the right references when a redraw occurs
		this.refLabel = null;
		this.refPaths = [];

		return (
			<g>
				{paths}
				{this.props.link.label && this.generateLabel()}
			</g>
		);
	}
}
