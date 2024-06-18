/**
 * cytoscape-layers
 * https://github.com/sgratzl/cytoscape.js-layers
 *
 * Copyright (c) 2020 Samuel Gratzl <sam@sgratzl.com>
 */

import cy from 'cytoscape';

interface IPoint {
    x: number;
    y: number;
}
interface IRenderHint {
    forExport?: boolean;
}
interface IRenderFunction {
    (ctx: CanvasRenderingContext2D, hint: IRenderHint): void;
}
interface IDOMUpdateFunction<T extends HTMLElement | SVGElement> {
    (node: T, e?: any): void;
}
interface ILayerOptions {
    stopClicks?: boolean;
}
type ISVGLayerOptions = ILayerOptions;
type IHTMLLayerOptions = ILayerOptions;
interface ICanvasLayerOptions extends ILayerOptions, Partial<CanvasRenderingContext2DSettings> {
    pixelRatio?: number;
}
interface ILayerDescFunction {
    (type: 'svg', options?: ISVGLayerOptions): ISVGLayer;
    (type: 'svg-static', options?: ISVGLayerOptions): ISVGStaticLayer;
    (type: 'canvas', options?: ICanvasLayerOptions): ICanvasLayer;
    (type: 'canvas-static', options?: ICanvasLayerOptions): ICanvasStaticLayer;
    (type: 'html', options?: IHTMLLayerOptions): IHTMLLayer;
    (type: 'html-static', options?: IHTMLLayerOptions): IHTMLStaticLayer;
}
interface IMoveAbleLayer {
    readonly cy: cy.Core;
    moveUp(): void;
    moveDown(): void;
    moveBack(): void;
    moveFront(): void;
    insertBefore: ILayerDescFunction;
    insertAfter: ILayerDescFunction;
}
interface ICustomLayer extends IMoveAbleLayer {
    remove(): void;
    hide(): void;
    show(): void;
    visible: boolean;
    updateOnRender: boolean;
    update(e?: any): void;
    updateOnRenderOnce(): void;
}
interface ITransformedLayer extends ICustomLayer {
    /**
     * checks whether the given point in model coordinates is visible i.e., within the visible rendered bounds
     * @param point
     */
    inVisibleBounds(point: IPoint | cy.BoundingBox12): boolean;
}
interface ISVGLayer extends ITransformedLayer {
    readonly type: 'svg';
    readonly node: SVGElement;
    updateOnTransform: boolean;
    readonly callbacks: IDOMUpdateFunction<SVGElement>[];
    callback(callback: IDOMUpdateFunction<SVGElement>): ISVGLayer;
}
interface ISVGStaticLayer extends ICustomLayer {
    readonly type: 'svg-static';
    readonly node: SVGElement;
    readonly callbacks: IDOMUpdateFunction<SVGElement>[];
    callback(callback: IDOMUpdateFunction<SVGElement>): ISVGStaticLayer;
}
interface ICanvasLayer extends ITransformedLayer {
    readonly type: 'canvas';
    readonly callbacks: IRenderFunction[];
    callback(callback: IRenderFunction): ICanvasLayer;
}
interface ICanvasStaticLayer extends ICustomLayer {
    readonly type: 'canvas-static';
    readonly callbacks: IRenderFunction[];
    callback(callback: IRenderFunction): ICanvasStaticLayer;
}
interface IHTMLLayer extends ITransformedLayer {
    readonly type: 'html';
    readonly node: HTMLElement;
    updateOnTransform: boolean;
    readonly callbacks: IDOMUpdateFunction<HTMLElement>[];
    callback(callback: IDOMUpdateFunction<HTMLElement>): IHTMLLayer;
}
interface IHTMLStaticLayer extends ICustomLayer {
    readonly type: 'html-static';
    readonly node: HTMLElement;
    readonly callbacks: IDOMUpdateFunction<HTMLElement>[];
    callback(callback: IDOMUpdateFunction<HTMLElement>): IHTMLStaticLayer;
}
interface ICytoscapeNodeLayer extends IMoveAbleLayer {
    readonly node: HTMLCanvasElement;
    readonly type: 'node';
}
interface ICytoscapeDragLayer extends IMoveAbleLayer {
    readonly node: HTMLCanvasElement;
    readonly type: 'drag';
}
interface ICytoscapeSelectBoxLayer extends IMoveAbleLayer {
    readonly node: HTMLCanvasElement;
    readonly type: 'select-box';
}
type ILayer = ICytoscapeNodeLayer | ICytoscapeDragLayer | ICytoscapeSelectBoxLayer | IHTMLLayer | IHTMLStaticLayer | ISVGLayer | ISVGStaticLayer | ICanvasLayer | ICanvasStaticLayer;

interface ILayerImpl {
    readonly root: HTMLElement | SVGElement;
    resize(width: number, height: number): void;
    remove(): void;
    setViewport(tx: number, ty: number, zoom: number): void;
    supportsRender(): boolean;
    renderInto(ctx: CanvasRenderingContext2D): void;
}

interface ICallbackRemover {
    remove(): void;
}

interface IElementLayerOptions {
    /**
     * selector to determine elements to render
     * @default :visible
     */
    selector: string;
    /**
     * whether to update the collection on each update
     */
    queryEachTime: boolean;
    /**
     * automatically update the layer upon a certain event
     * render ... upon render
     * none ... only when add/remove
     * position or custom ... extra events to listen to
     * @default auto = render in case of a queryEachTime else position
     */
    updateOn: 'render' | 'position' | 'none' | string;
    /**
     * whether to check that the element is actually visible
     * @default true
     */
    checkBounds: boolean;
}

interface IRenderPerEdgeResult extends ICallbackRemover {
    layer: ICanvasLayer;
    edges: cy.EdgeCollection;
}
interface IEdgeLayerOptions extends IElementLayerOptions {
    checkBoundsPointCount: number;
    /**
     * init function for the collection
     * @param edges
     */
    initCollection(edges: cy.EdgeCollection): void;
}
declare function renderPerEdge(layer: ICanvasLayer, render: (ctx: CanvasRenderingContext2D, edge: cy.EdgeSingular, path: Path2D, start: IPoint, end: IPoint) => void, options?: Partial<IEdgeLayerOptions>): IRenderPerEdgeResult;

interface INodeCollection extends cy.NodeCollection {
    isNode(): boolean;
}
interface INodeLayerOption extends IElementLayerOptions {
    /**
     * how to compute the bounding box
     */
    boundingBox: cy.BoundingBoxOptions;
    /**
     * where to position the canvas / node relative to a node
     */
    position: 'none' | 'top-left' | 'center';
    /**
     * init function for the collection
     * @param nodes
     */
    initCollection(nodes: cy.NodeCollection): void;
}
interface INodeDOMLayerOption<T extends HTMLElement | SVGElement> extends INodeLayerOption {
    /**
     * whether to use unique DOM elements per node (id), similar to D3 key argument
     * @default false
     */
    uniqueElements: boolean;
    /**
     * Determines whether a single update is allowed. If true, it will use uniqueElements.
     * @default false
     */
    allowPartialUpdate: boolean;
    /**
     * init function for newly created DOM elements
     * @param elem
     * @param node
     */
    init(elem: T, node: cy.NodeSingular, bb: cy.BoundingBox12 & cy.BoundingBoxWH): void;
    /**
     * additional transform to apply to a node
     */
    transform?: string;
}
interface INodeCanvasLayerOption extends INodeLayerOption {
    /**
     * init function for newly added node
     * @param elem
     * @param node
     */
    init(node: cy.NodeSingular, bb: cy.BoundingBox12 & cy.BoundingBoxWH): void;
}
interface IRenderPerNodeResult extends ICallbackRemover {
    layer: ILayer;
    nodes: cy.NodeCollection;
}
declare function renderPerNode(layer: ICanvasLayer, render: (ctx: CanvasRenderingContext2D, node: cy.NodeSingular, bb: cy.BoundingBox12 & cy.BoundingBoxWH) => void, options?: Partial<INodeCanvasLayerOption>): IRenderPerNodeResult;
declare function renderPerNode(layer: IHTMLLayer, render: (elem: HTMLElement, node: cy.NodeSingular, bb: cy.BoundingBox12 & cy.BoundingBoxWH) => void, options?: Partial<INodeDOMLayerOption<HTMLElement>>): IRenderPerNodeResult;
declare function renderPerNode(layer: ISVGLayer, render: (elem: SVGElement, node: cy.NodeSingular, bb: cy.BoundingBox12 & cy.BoundingBoxWH) => void, options?: Partial<INodeDOMLayerOption<SVGElement>>): IRenderPerNodeResult;

interface LayerExportOptions {
    ignoreUnsupportedLayers?: boolean;
    ignoreUnsupportedLayerOrder?: boolean;
}
declare class LayerExportException extends Error {
}
declare class LayersPlugin {
    readonly cy: cy.Core;
    private bak;
    readonly nodeLayer: ICytoscapeNodeLayer;
    readonly dragLayer: ICytoscapeDragLayer;
    readonly selectBoxLayer: ICytoscapeSelectBoxLayer;
    private readonly adapter;
    private readonly viewport;
    constructor(cy: cy.Core);
    private move;
    get document(): Document;
    get root(): HTMLElement;
    private get layers();
    getLayers(): readonly ILayer[];
    private readonly resize;
    private readonly destroy;
    private readonly zoomed;
    private init;
    update(): void;
    private createLayer;
    append(type: 'svg', options?: ISVGLayerOptions): ISVGLayer;
    append(type: 'svg-static', options?: ISVGLayerOptions): ISVGStaticLayer;
    append(type: 'canvas', options?: ICanvasLayerOptions): ICanvasLayer;
    append(type: 'canvas-static', options?: ICanvasLayerOptions): ICanvasStaticLayer;
    append(type: 'html', options?: IHTMLLayerOptions): IHTMLLayer;
    append(type: 'html-static', options?: IHTMLLayerOptions): IHTMLStaticLayer;
    insert(where: 'before' | 'after', layer: ILayer & ILayerImpl, type: 'svg', options?: ISVGLayerOptions): ISVGLayer;
    insert(where: 'before' | 'after', layer: ILayer & ILayerImpl, type: 'svg-static', options?: ISVGLayerOptions): ISVGStaticLayer;
    insert(where: 'before' | 'after', layer: ILayer & ILayerImpl, type: 'canvas', options?: ICanvasLayerOptions): ICanvasLayer;
    insert(where: 'before' | 'after', layer: ILayer & ILayerImpl, type: 'canvas-static', options?: ICanvasLayerOptions): ICanvasStaticLayer;
    insert(where: 'before' | 'after', layer: ILayer & ILayerImpl, type: 'html', options?: IHTMLLayerOptions): IHTMLLayer;
    insert(where: 'before' | 'after', layer: ILayer & ILayerImpl, type: 'html-static', options?: IHTMLLayerOptions): IHTMLStaticLayer;
    insert(where: 'before' | 'after', layer: ILayer & ILayerImpl, type: 'svg' | 'html' | 'canvas' | 'svg-static' | 'html-static' | 'canvas-static', options?: IHTMLLayerOptions | ISVGLayerOptions | ICanvasLayerOptions): ISVGLayer | ICanvasLayer | IHTMLLayer;
    getLast(): ILayer | null;
    getFirst(): ILayer | null;
    private hasCustomLayer;
    private toCanvas;
    /**
     * Export the current graph view as a PNG image in Base64 representation.
     */
    png(options?: cy.ExportStringOptions & LayerExportOptions): string;
    png(options?: cy.ExportBlobOptions & LayerExportOptions): Blob;
    png(options?: cy.ExportBlobPromiseOptions & LayerExportOptions): Promise<Blob>;
    /**
     * Export the current graph view as a JPG image in Base64 representation.
     */
    jpg(options?: cy.ExportJpgStringOptions & LayerExportOptions): string;
    jpg(options?: cy.ExportJpgBlobOptions & LayerExportOptions): Blob;
    jpg(options?: cy.ExportJpgBlobPromiseOptions & LayerExportOptions): Promise<Blob>;
    /**
     * Export the current graph view as a JPG image in Base64 representation.
     */
    jpeg(options?: cy.ExportJpgStringOptions): string;
    jpeg(options?: cy.ExportJpgBlobOptions): Blob;
    jpeg(options?: cy.ExportJpgBlobPromiseOptions): Promise<Blob>;
    readonly renderPerEdge: typeof renderPerEdge;
    readonly renderPerNode: typeof renderPerNode;
}
declare function layers(this: cy.Core): LayersPlugin;
declare function layers(cy: cy.Core): LayersPlugin;

declare function register(cytoscape: (type: 'core' | 'collection' | 'layout', name: string, extension: unknown) => void): void;
declare namespace cytoscape {
    type Ext2 = (cytoscape: (type: 'core' | 'collection' | 'layout', name: string, extension: unknown) => void) => void;
    function use(module: Ext2): void;
    interface Core {
        layers: typeof layers;
    }
}

export { type ICanvasLayer, type ICanvasLayerOptions, type ICanvasStaticLayer, type ICustomLayer, type ICytoscapeDragLayer, type ICytoscapeNodeLayer, type ICytoscapeSelectBoxLayer, type IDOMUpdateFunction, type IEdgeLayerOptions, type IHTMLLayer, type IHTMLLayerOptions, type IHTMLStaticLayer, type ILayer, type ILayerDescFunction, type ILayerOptions, type IMoveAbleLayer, type INodeCanvasLayerOption, type INodeCollection, type INodeDOMLayerOption, type INodeLayerOption, type IPoint, type IRenderFunction, type IRenderHint, type IRenderPerEdgeResult, type IRenderPerNodeResult, type ISVGLayer, type ISVGLayerOptions, type ISVGStaticLayer, type ITransformedLayer, LayerExportException, type LayerExportOptions, LayersPlugin, cytoscape, register as default, layers, renderPerEdge, renderPerNode };
//# sourceMappingURL=index.d.ts.map
