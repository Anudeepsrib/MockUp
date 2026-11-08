import assert from 'node:assert/strict';
import {graphPoint,initialViewport,zoomGraph} from '../src/lib/graph-interaction.ts';

assert.deepEqual(graphPoint({x:420,y:275},initialViewport),{x:420,y:275});
assert.deepEqual(graphPoint({x:460,y:255},{x:40,y:-20,zoom:2}),{x:420,y:275});
assert.equal(zoomGraph(initialViewport,.01).zoom,.5);
assert.equal(zoomGraph(initialViewport,100).zoom,4);
assert.deepEqual(zoomGraph(initialViewport,2),{x:0,y:0,zoom:2});
for(const view of [initialViewport,{x:80,y:-30,zoom:1.5}]) {
  const anchor={x:215,y:167},before=graphPoint(anchor,view),after=graphPoint(anchor,zoomGraph(view,2.7,anchor));
  assert.ok(Math.abs(before.x-after.x)<1e-9&&Math.abs(before.y-after.y)<1e-9,'Zoom must keep the memory under the cursor stationary');
  const start=graphPoint({x:100,y:100},view),end=graphPoint({x:140,y:160},view);
  assert.ok(Math.abs((end.x-start.x)-40/view.zoom)<1e-9,'Node drag distance must account for zoom');
  assert.ok(Math.abs((end.y-start.y)-60/view.zoom)<1e-9);
}
console.log('Graph interaction self-check passed: pan coordinates, zoom limits, cursor anchoring, and node drag scaling.');
