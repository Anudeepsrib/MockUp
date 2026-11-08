export type GraphPoint={x:number;y:number};
export type GraphViewport=GraphPoint & {zoom:number};
export const initialViewport:GraphViewport={x:0,y:0,zoom:1};
const center={x:420,y:275};

export function graphPoint(point:GraphPoint,view:GraphViewport):GraphPoint {
  return {x:center.x+(point.x-center.x-view.x)/view.zoom,y:center.y+(point.y-center.y-view.y)/view.zoom};
}

export function zoomGraph(view:GraphViewport,requestedZoom:number,anchor:GraphPoint=center):GraphViewport {
  const zoom=Math.min(4,Math.max(.5,requestedZoom)),world=graphPoint(anchor,view);
  return {zoom,x:anchor.x-center.x-(world.x-center.x)*zoom,y:anchor.y-center.y-(world.y-center.y)*zoom};
}
