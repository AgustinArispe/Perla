import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { CatalogRepository } from '../../src/worker/products/repository';
import { LocationTransferService } from '../../src/worker/locations/service';

test('resume cinco ubicaciones con 4.000 productos sin recorrer por fila desde la aplicación',()=>{
  const db=openDatabase(':memory:');
  try{
    const catalog=new CatalogRepository(db),service=new LocationTransferService(db,catalog);
    const locations=[service.listLocations()[0]!.id];
    const now=new Date().toISOString();
    for(let index=1;index<5;index++){const id=randomUUID();db.prepare('INSERT INTO locations(id,name,code,active,is_default,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,1,0,1,?,?)').run(id,`Local ${index}`,`LOCAL-${index}`,now,now);locations.push(id);}
    const product=db.prepare('INSERT INTO products(id,sku,barcode,name,search_name,category,sale_unit,price_cents,active,track_stock,stock_initialized,min_stock_base,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,?,?,?,?,?,1,1,1,5,1,?,?)');
    const balance=db.prepare('INSERT INTO inventory_balances(product_id,quantity_base,revision) VALUES (?,?,1)');
    const local=db.prepare('INSERT INTO location_inventory_balances(location_id,product_id,quantity_base,revision) VALUES (?,?,?,1)');
    const sale=db.prepare("INSERT INTO sales(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json,location_id) VALUES (?,?,?,?, 'COMPLETED',?,?,?,?,0,?,'{}',?)");
    db.transaction(()=>{
      for(let index=0;index<4000;index++){const id=`perf-product-${index}`;product.run(id,`PERF-${index}`,null,`Producto ${index}`,`producto ${index}`,null,index%4===0?'KG':'UNIT',1000,now,now);balance.run(id,50);for(const locationId of locations)local.run(locationId,id,10);}
      for(let index=0;index<1000;index++){const locationId=locations[index%locations.length]!;sale.run(randomUUID(),index+1,randomUUID(),`hash-${index}`,now,'2026-10-05','2026-10',1000,1000,locationId);}
    })();
    service.summary({month:'2026-10'});
    const samples=Array.from({length:20},()=>{const start=performance.now();const report=service.summary({month:'2026-10'});expect(report.total.saleCount).toBe(1000);return performance.now()-start;}).sort((a,b)=>a-b);
    const p95=samples[Math.floor(samples.length*.95)]!;
    console.log(`Resumen de 5 ubicaciones y 4.000 productos: p95=${p95.toFixed(2)}ms.`);
    expect(p95).toBeLessThan(500);
  }finally{db.close();}
});
