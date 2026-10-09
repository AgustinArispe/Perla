import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { DraftRepository } from '../../src/worker/drafts';
import { SalesService } from '../../src/worker/sales/service';
import { PromotionService } from '../../src/worker/promotions/service';
import { ReturnService } from '../../src/worker/returns/service';
import { ReceiptService } from '../../src/worker/receipts/service';
import { MonthlyReports } from '../../src/worker/reports/queries';

it('aplica y congela una promoción activa al confirmar la venta', () => {
  const db=openDatabase(':memory:');
  try {
    const actor=new AuthService(db).bootstrap({name:'Dueña',username:'jefe',password:'Prueba-Perla-2026!'}).user;
    const catalog=new CatalogRepository(db);
    const product=catalog.save({sku:'PROMO-1',barcode:null,name:'Filet en oferta',category:'Pescados',saleUnit:'UNIT',priceCents:100000,active:true,trackStock:false,minStockBase:0});
    const promotions=new PromotionService(db);
    const promotion=promotions.save({name:'20% apertura',type:'PERCENT',status:'ACTIVE',priority:10,startsAt:null,endsAt:null,productIds:[product.id],categoryIds:[],brandIds:[],basisPoints:2000},actor);
    const stock=new StockService(db,catalog);
    const sales=new SalesService(db,catalog,stock,new DraftRepository(db),()=>false,undefined,()=>false,promotions,()=>true);
    const body={checkoutKey:randomUUID(),lines:[{lineId:randomUUID(),productId:product.id,quantityBase:2,expectedProductRevision:product.revision,expectedPriceCents:product.priceCents}],discount:{type:'NONE'} as const};
    const quote=sales.quote(body);
    expect(quote).toMatchObject({subtotalCents:200000,discountCents:40000,totalCents:160000});
    expect(quote.quoteHash).toHaveLength(64);
    expect(quote.promotions[0]).toMatchObject({name:'20% apertura',discountCents:40000});
    expect(sales.quote({...body,discount:{type:'FIXED',amountCents:10000}})).toMatchObject({discountCents:10000,totalCents:190000,promotions:[]});
    const promotionsOff=new SalesService(db,catalog,stock,new DraftRepository(db),()=>false,undefined,()=>false,promotions,()=>false);
    expect(promotionsOff.quote(body)).toMatchObject({discountCents:0,totalCents:200000,promotions:[]});
    const sale=sales.complete({...body,expectedQuoteHash:quote.quoteHash,payments:[{method:'DEBIT',amountCents:160000}]},actor);
    expect(sale).toMatchObject({subtotalCents:200000,discountCents:40000,totalCents:160000});
    expect(sale.promotions?.[0]).toMatchObject({name:'20% apertura',discountCents:40000});
    expect(db.prepare('SELECT promotion_name,discount_cents FROM sale_promotions').get()).toEqual({promotion_name:'20% apertura',discount_cents:40000});
    const receipt=new ReceiptService(db,(saleId)=>sales.detail(saleId)).create({saleId:sale.id,format:'THERMAL_80'},actor);
    expect(receipt.snapshot.sale.promotions?.[0]).toMatchObject({name:'20% apertura',discountCents:40000});
    const returned=new ReturnService(db,stock,sales).confirm({saleId:sale.id,operationKey:randomUUID(),reason:'Devolución promocionada',refundMethod:'DEBIT',items:[{saleItemId:sale.items[0]!.id,quantityBase:1,disposition:'NONE'}]},actor);
    expect(returned.totalCents).toBe(80000);
    expect(new MonthlyReports(db).month(sale.localMonth).totals.netCents).toBe(80000);
    const paused=promotions.save({...promotion.input,status:'PAUSED'},actor);
    expect(sales.detail(sale.id).totalCents).toBe(160000);
    const nextBody={...body,checkoutKey:randomUUID(),lines:[{...body.lines[0]!,lineId:randomUUID()}]};
    const withoutPromotion=sales.quote(nextBody);
    expect(withoutPromotion.totalCents).toBe(200000);
    promotions.save({...paused.input,status:'ACTIVE'},actor);
    expect(()=>sales.complete({...nextBody,expectedQuoteHash:withoutPromotion.quoteHash,payments:[{method:'DEBIT',amountCents:200000}]},actor)).toThrow('promociones cambiaron');
  } finally { db.close(); }
});
