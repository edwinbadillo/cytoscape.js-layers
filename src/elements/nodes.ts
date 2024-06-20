import type cy from 'cytoscape';
import type { ICanvasLayer, IHTMLLayer, ISVGLayer, ILayer, IRenderHint } from '../layers';
import { SVG_NS } from '../layers/SVGLayer';
import { matchNodes, registerCallback, ICallbackRemover, IMatchOptions } from './utils';
import { IElementLayerOptions, defaultElementLayerOptions } from './common';

export interface INodeCollection extends cy.NodeCollection {
  isNode(): boolean;
}


export interface INodeLayerOption extends IElementLayerOptions {
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

export interface INodeDOMLayerOption<T extends HTMLElement | SVGElement> extends INodeLayerOption {
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

export interface INodeCanvasLayerOption extends INodeLayerOption {
  /**
   * init function for newly added node
   * @param elem
   * @param node
   */
  init(node: cy.NodeSingular, bb: cy.BoundingBox12 & cy.BoundingBoxWH): void;
}

export interface IRenderPerNodeResult extends ICallbackRemover {
  layer: ILayer;
  nodes: cy.NodeCollection;
}

export function renderPerNode(
  layer: ICanvasLayer,
  render: (ctx: CanvasRenderingContext2D, node: cy.NodeSingular, bb: cy.BoundingBox12 & cy.BoundingBoxWH) => void,
  options?: Partial<INodeCanvasLayerOption>
): IRenderPerNodeResult;
export function renderPerNode(
  layer: IHTMLLayer,
  render: (elem: HTMLElement, node: cy.NodeSingular, bb: cy.BoundingBox12 & cy.BoundingBoxWH) => void,
  options?: Partial<INodeDOMLayerOption<HTMLElement>>
): IRenderPerNodeResult;
export function renderPerNode(
  layer: ISVGLayer,
  render: (elem: SVGElement, node: cy.NodeSingular, bb: cy.BoundingBox12 & cy.BoundingBoxWH) => void,
  options?: Partial<INodeDOMLayerOption<SVGElement>>
): IRenderPerNodeResult;
export function renderPerNode(
  layer: ICanvasLayer | IHTMLLayer | ISVGLayer,
  render: (ctx: any, node: cy.NodeSingular, bb: cy.BoundingBox12 & cy.BoundingBoxWH) => void,
  options: Partial<INodeDOMLayerOption<any> | INodeCanvasLayerOption> = {}
): IRenderPerNodeResult {
  const o = Object.assign(
    {
      transform: '',
      position: 'top-left',
      boundingBox: {
        includeLabels: false,
        includeOverlays: false,
      },
      uniqueElements: false,
      allowPartialUpdate: false,
      initCollection: () => undefined,
    },
    defaultElementLayerOptions(options),
    options
  );

  let nodes = layer.cy.collection() as cy.NodeCollection;
  let updateOnRenderOnceEnabled = false;
  const revaluateAndUpdateOnce = () => {
    if (updateOnRenderOnceEnabled) {
      return;
    }
    updateOnRenderOnceEnabled = true;
    layer.cy.one('render', () => {
      updateOnRenderOnceEnabled = false;
      nodes = reevaluateCollection(nodes);
      layer.update();
    });
  };

  const removeNode = (e: any) => {
    const node = e.target;
    nodes = nodes.difference(node);
    layer.update(node);
  };

  const reevaluateCollection = (current: cy.NodeCollection) => {
    // clean up old
    if (o.updateOn !== 'none' && o.updateOn !== 'render') {
      current.off(o.updateOn, undefined, layer.updateOnRenderOnce);
    }
    if (o.allowPartialUpdate) {
      layer.cy.off('remove', o.selector, removeNode);
    }

    // init new
    const newNodes = layer.cy.nodes(o.selector);
    o.initCollection(newNodes);
    if (o.updateOn !== 'none' && o.updateOn !== 'render') {
      newNodes.on(o.updateOn, layer.updateOnRenderOnce);
    }
    if (o.allowPartialUpdate) {
      layer.cy.on('remove', o.selector, removeNode);
    }
    
    layer.updateOnRenderOnce();
    return newNodes;
  };

  if (o.updateOn === 'render') {
    layer.updateOnRender = true;
  }
  if (!o.queryEachTime) {
    nodes = reevaluateCollection(nodes);
    if (o.allowPartialUpdate && o.updateOn !== 'none' && o.updateOn !== 'render') {
      layer.cy.on('add', o.selector, revaluateAndUpdateOnce);
      layer.cy.on('remove', o.selector, removeNode);
    } else {
      layer.cy.on('add remove', o.selector, revaluateAndUpdateOnce);
    }
  }

  const wrapResult = (v: ICallbackRemover): IRenderPerNodeResult => ({
    layer,
    nodes,
    remove: () => {
      if (o.updateOn !== 'none' && o.updateOn !== 'render') {
        nodes.off(o.updateOn, undefined, layer.updateOnRenderOnce);
        if (o.allowPartialUpdate) {
          layer.cy.off('remove', o.selector, removeNode);
        }
      }
      layer.cy.off('add remove', o.selector, revaluateAndUpdateOnce);
      v.remove();
    },
  });

  if (layer.type === 'canvas') {
    const oCanvas = o as INodeCanvasLayerOption;
    const renderer = (ctx: CanvasRenderingContext2D, hint: IRenderHint) => {
      const t = ctx.getTransform();
      if (o.queryEachTime) {
        nodes = reevaluateCollection(nodes);
      }
      nodes.forEach((node: cy.NodeSingular) => {
        if (node.removed()) {
          return;
        }
        const bb = node.boundingBox(o.boundingBox);
        if (!hint.forExport && oCanvas.checkBounds && !layer.inVisibleBounds(bb)) {
          return;
        }
        if (oCanvas.position === 'top-left') {
          ctx.translate(bb.x1, bb.y1);
        } else if (oCanvas.position === 'center') {
          const pos = node.position();
          ctx.translate(pos.x, pos.y);
        }
        render(ctx, node, bb);
        if (oCanvas.position !== 'none') {
          ctx.setTransform(t);
        }
      });
    };
    return wrapResult(registerCallback(layer, renderer));
  }

  const oDOM = o as INodeDOMLayerOption<any>;
  // HTML or SVG
  const baseOptions = {
    bb: (node: cy.NodeSingular) => node.boundingBox(oDOM.boundingBox),
    isVisible: oDOM.checkBounds ? (bb: cy.BoundingBox12 & cy.BoundingBoxWH) => layer.inVisibleBounds(bb) : () => true,
    uniqueElements: oDOM.uniqueElements === true || oDOM.allowPartialUpdate === true,
    allowPartialUpdate: oDOM.allowPartialUpdate === true,
  };
  if (oDOM.checkBounds) {
    layer.updateOnTransform = true;
  }

  if (layer.type === 'html') {
    const matchOptions: IMatchOptions<HTMLElement> = {
      ...baseOptions,
      enter: (node: cy.NodeSingular, bb: cy.BoundingBox12 & cy.BoundingBoxWH) => {
        const r = layer.node.ownerDocument.createElement('div');
        r.style.position = 'absolute';
        if (oDOM.init) {
          oDOM.init(r, node, bb);
        }
        return r;
      },
      update: (elem, node, bb) => {
        if (oDOM.position === 'top-left') {
          elem.style.transform = `${oDOM.transform}translate3d(${bb.x1}px,${bb.y1}px,0)`;
        } else if (oDOM.position === 'center') {
          const pos = node.position();
          elem.style.transform = `${oDOM.transform}translate3d(${pos.x}px,${pos.y}px,0)`;
        }
        render(elem, node, bb);
      },
    };
    const renderer = (root: HTMLElement, node: INodeCollection) => {
      if (o.queryEachTime) {
        nodes = reevaluateCollection(nodes);
        matchNodes(root, nodes, matchOptions);
      } else if (node?.isNode?.()) {
        matchNodes(root, node, matchOptions);
      } else {
        matchNodes(root, nodes, matchOptions);
      }
    };
    return wrapResult(registerCallback(layer, renderer));
  }

  // if (layer.type === 'svg') {
  const matchOptions: IMatchOptions<SVGElement> = {
    ...baseOptions,
    enter: (node: cy.NodeSingular, bb: cy.BoundingBox12 & cy.BoundingBoxWH) => {
      const r = layer.node.ownerDocument.createElementNS(SVG_NS, 'g');
      if (oDOM.init) {
        oDOM.init(r, node, bb);
      }
      return r;
    },
    update: (elem, node, bb) => {
      if (oDOM.position === 'top-left') {
        elem.setAttribute('transform', `${oDOM.transform}translate3d(${bb.x1},${bb.y1},0)`);
      } else if (oDOM.position === 'center') {
        const pos = node.position();
        elem.setAttribute('transform', `${oDOM.transform}translate3d(${pos.x},${pos.y},0)`);
      }
      render(elem, node, bb);
    },
  };
  const renderer = (root: SVGElement, node: INodeCollection) => {
    if (o.queryEachTime) {
      nodes = reevaluateCollection(nodes);
      matchNodes(root, nodes, matchOptions);
    } else if (node?.isNode?.()) {
      matchNodes(root, node, matchOptions);
    } else {
      matchNodes(root, nodes, matchOptions);
    }
  };
  return wrapResult(registerCallback(layer, renderer));
}
