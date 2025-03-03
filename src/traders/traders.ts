import { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";
import { ILogger } from "../../types/models/spt/utils/ILogger";
import { ITraderConfig } from "@spt/models/spt/config/ITraderConfig";
import { IBarterScheme, ITrader, ITraderAssort } from "@spt/models/eft/common/tables/ITrader";
import { container } from "tsyringe";
import { Arrays } from "../utils/arrays";
import { TraderAssortHelper } from "@spt/helpers/TraderAssortHelper";
import { Item } from "@spt/models/eft/common/tables/IItem";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { Utils, ProfileTracker } from "../utils/utils";
import { Calibers, ParentClasses } from "../utils/enums";
import { RagfairServer } from "@spt/servers/RagfairServer";
import { ISearchRequestData } from "@spt/models/eft/ragfair/ISearchRequestData";
import { IGetBodyResponseData } from "@spt/models/eft/httpResponse/IGetBodyResponseData";
import { IGetOffersResult } from "@spt/models/eft/ragfair/IGetOffersResult";
import { RagfairCallbacks } from "@spt/callbacks/RagfairCallbacks";
import { ITemplateItem } from "@spt/models/eft/common/tables/ITemplateItem";
import { EventTracker } from "../misc/seasonalevents";
import { IPmcData } from "@spt/models/eft/common/IPmcData";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";


const modConfig = require("../../config/config.json");

const AssaultRifleTemplates = require("../../db/templates/weapons/AssaultRifleTemplates.json");
const AssaultCarbineTemplates = require("../../db/templates/weapons/AssaultCarbineTemplates.json");
const MachinegunTemplates = require("../../db/templates/weapons/MachinegunTemplates.json");
const MarksmanRifleTemplates = require("../../db/templates/weapons/MarksmanRifleTemplates.json");
const PistolTemplates = require("../../db/templates/weapons/PistolTemplates.json");
const ShotgunTemplates = require("../../db/templates/weapons/ShotgunTemplates.json");
const SMGTemplates = require("../../db/templates/weapons/SMGTemplates.json");
const SniperRifleTemplates = require("../../db/templates/weapons/SniperRifleTemplates.json");
const SpecialWeaponTemplates = require("../../db/templates/weapons/SpecialWeaponTemplates.json");
const GrenadeLauncherTemplates = require("../../db/templates/weapons/GrenadeLauncherTemplates.json");

const armorComponentsTemplates = require("../../db/templates/gear/armorComponentsTemplates.json");
const armorChestrigTemplates = require("../../db/templates/gear/armorChestrigTemplates.json");
const helmetTemplates = require("../../db/templates/gear/helmetTemplates.json");
const armorVestsTemplates = require("../../db/templates/gear/armorVestsTemplates.json");
const armorMasksTemplates = require("../../db/templates/gear/armorMasksTemplates.json");
const chestrigTemplates = require("../../db/templates/gear/chestrigTemplates.json");
const headsetTemplates = require("../../db/templates/gear/headsetTemplates.json");

const ammoDB = require("../../db/templates/ammo/ammoTemplates.json");

const weapTemplatesArr = [AssaultCarbineTemplates, AssaultRifleTemplates, MachinegunTemplates, MarksmanRifleTemplates, PistolTemplates, ShotgunTemplates, SMGTemplates, SniperRifleTemplates, SpecialWeaponTemplates, GrenadeLauncherTemplates];
const gearTemlplatesArr = [armorComponentsTemplates, armorChestrigTemplates, helmetTemplates, armorVestsTemplates, armorMasksTemplates, chestrigTemplates, headsetTemplates];

const traderRepairs = require("../../db/traders/repair/traderRepair.json");
const fenceLimits = require("../../db/traders/fence/fenceLimits.json");
const buyCat = require("../../db/traders/buy_categories.json");

const prapId = "54cb50c76803fa8b248b4571";
const theraId = "54cb57776803fa99248b456e";
const skierId = "58330581ace78e27b8b10cee";
const pkId = "5935c25fb3acc3127c3d8cd9";
const mechId = "5a7c2eca46aef81a7ca2145d";
const ragmId = "5ac3b934156ae10c4430e83c";
const jaegId = "5c0647fdd443bc2504c2d371";
const fenceId = "579dc571d53a0658a154fbec";

export class Traders {
    constructor(private logger: ILogger, private tables: IDatabaseTables, private modConf, private traderConf: ITraderConfig, private array: Arrays, private utils: Utils) { }

    itemDB(): Record<string, ITemplateItem> {
        return this.tables.templates.items;
    }

    private modifyTraderBuyPrice(traderId: string, basePrice: number) {
        for (let i in this.tables.traders[traderId].base.loyaltyLevels) {
            let multi = Number(i);
            this.tables.traders[traderId].base.loyaltyLevels[i].buy_price_coef = Math.max(Math.round(basePrice - (multi * 5)), 40);
        }
    }

    public loadTraderTweaks() {
        if (modConfig.change_buy_categories == true) {
            this.tables.traders[pkId].base.items_buy.category = buyCat.peacekeeper;
            this.tables.traders[ragmId].base.items_buy.category = buyCat.ragman;
            this.tables.traders[jaegId].base.items_buy.category = buyCat.jaeger;
            this.tables.traders[prapId].base.items_buy.category = buyCat.prapor;
            this.tables.traders[theraId].base.items_buy.category = buyCat.therapist;
            this.tables.traders[skierId].base.items_buy.category = buyCat.skier;
            this.tables.traders[mechId].base.items_buy.category = buyCat.mechanic;
        }

        if (modConfig.change_buy_price == true) {

            this.modifyTraderBuyPrice(pkId, this.utils.pickRandNumInRange(69, 73));
            this.modifyTraderBuyPrice(ragmId, this.utils.pickRandNumInRange(69, 73));
            this.modifyTraderBuyPrice(jaegId, this.utils.pickRandNumInRange(75, 80));
            this.modifyTraderBuyPrice(prapId, this.utils.pickRandNumInRange(65, 75));
            this.modifyTraderBuyPrice(theraId, this.utils.pickRandNumInRange(78, 84));
            this.modifyTraderBuyPrice(skierId, this.utils.pickRandNumInRange(65, 70));
            this.modifyTraderBuyPrice(mechId, this.utils.pickRandNumInRange(69, 69));
            this.modifyTraderBuyPrice(fenceId, this.utils.pickRandNumInRange(80, 90));
        }

        if (modConfig.nerf_fence == true) {
            this.traderConf.fence.discountOptions.assortSize = 10;
            this.traderConf.fence.discountOptions.presetPriceMult = 2.5;
            this.traderConf.fence.discountOptions.itemPriceMult = 2;
            this.traderConf.fence.weaponPresetMinMax.min = 0;
            this.traderConf.fence.weaponPresetMinMax.max = 4;
            this.traderConf.fence.partialRefreshChangePercent = 50;
            this.traderConf.fence.discountOptions.assortSize = 10;
            this.traderConf.fence.assortSize = 30;
            this.traderConf.fence.itemPriceMult = 1.8;
            this.traderConf.fence.presetPriceMult = 2.25;
            this.traderConf.fence.itemTypeLimits = fenceLimits.itemTypeLimits;
            this.traderConf.fence.ammoMaxPenLimit = 70;

            //ammo
            this.traderConf.fence.itemStackSizeOverrideMinMax["5485a8684bdc2da71d8b4567"].min = 60;
            this.traderConf.fence.itemStackSizeOverrideMinMax["5485a8684bdc2da71d8b4567"].max = 200;
            //ammo box
            this.traderConf.fence.itemStackSizeOverrideMinMax["543be5cb4bdc2deb348b4568"].min = 1;
            this.traderConf.fence.itemStackSizeOverrideMinMax["543be5cb4bdc2deb348b4568"].max = 5;
            //magazine
            this.traderConf.fence.itemStackSizeOverrideMinMax["5448bc234bdc2d3c308b4569"].min = 1;
            this.traderConf.fence.itemStackSizeOverrideMinMax["5448bc234bdc2d3c308b4569"].max = 10;
            //drugs
            this.traderConf.fence.itemStackSizeOverrideMinMax["5448f3a14bdc2d27728b4569"].min = 1;
            this.traderConf.fence.itemStackSizeOverrideMinMax["5448f3a14bdc2d27728b4569"].max = 4;

        }

        if (modConfig.change_heal_cost == true) {
            this.tables.globals.config.Health.HealPrice.HealthPointPrice = 100;
            this.tables.globals.config.Health.HealPrice.EnergyPointPrice = 30;
            this.tables.globals.config.Health.HealPrice.HydrationPointPrice = 30;
        }

        if (this.modConf.logEverything == true) {
            this.logger.info("Traders Loaded");
        }
    }

    public loadTraderRefreshTimes() {
        for (let trader in this.traderConf.updateTime) {
            this.traderConf.updateTime[trader].seconds.min = modConfig.trader_refresh_time;
            this.traderConf.updateTime[trader].seconds.max = modConfig.trader_refresh_time;
        }
    }

    public loadTraderRepairs() {
        this.tables.traders[prapId].base.repair = traderRepairs.PraporRepair;
        this.tables.traders[skierId].base.repair = traderRepairs.SkierRepair;
        this.tables.traders[mechId].base.repair = traderRepairs.MechanicRepair;

        for (let ll in this.tables.traders[prapId].base.loyaltyLevels) {
            this.tables.traders[prapId].base.loyaltyLevels[ll].repair_price_coef *= 0.5
        }
        for (let ll in this.tables.traders[skierId].base.loyaltyLevels) {
            this.tables.traders[skierId].base.loyaltyLevels[ll].repair_price_coef *= 0.25
        }
        for (let ll in this.tables.traders[mechId].base.loyaltyLevels) {
            this.tables.traders[mechId].base.loyaltyLevels[ll].repair_price_coef *= 0.85
        }
    }

    public setBaseOfferValues() {
        for (let t in this.tables.traders) {
            let trader = this.tables.traders[t];
            if (trader?.assort?.items === undefined || trader.base.nickname === "БТР" || trader.base.nickname.toLowerCase() === "fence") continue;
            if (modConfig.change_trader_ll == true) {
                this.setLoyaltyLevels(trader);
            }
            this.setBasePrices(trader);
        }
    }


    public setBasePrices(trader: ITrader) {
        if (modConfig.realistic_ballistics == true) {
            this.setBasePrice(ammoDB, trader);
        }
    }

    public setBasePrice(db: any[], trader: ITrader) {
        for (let item in trader.assort.items) { //loop offers
            if (trader.assort.items[item].parentId !== "hideout") continue;
            let offer = trader.assort.items[item];
            let offerId = offer._id;
            let offerTpl = offer._tpl;
            if (db[offerTpl]) {
                let barter = trader?.assort?.barter_scheme[offerId][0][0];
                if (this.itemDB()[barter?._tpl]?._parent !== ParentClasses.MONEY) continue;
                let templateItem = db[offerTpl];
                let priceModifier = templateItem?.BasePriceModifier !== undefined ?templateItem?.BasePriceModifier : 1;
                barter.count *= priceModifier;
            }
        }
    }

    public setLoyaltyLevels(trader: ITrader) {
        this.loyaltyLevelHelper(ammoDB, false, trader);
        this.loyaltyLevelHelper(weapTemplatesArr, true, trader);
        this.loyaltyLevelHelper(gearTemlplatesArr, true, trader);
    }

    private loyaltyLevelHelper(db: any[], multifile: boolean, trader: ITrader) {
        if (multifile == false) {
            this.setLL(db, trader);

        } else {
            for (let files in db) {
                let file = db[files];
                this.setLL(file, trader);
            }
        }
    }

    private setLL(db, trader: ITrader) {
        for (let item in trader.assort.items) {
            if (trader.assort.items[item].parentId !== "hideout") continue;
            let offer = trader.assort.items[item];
            let offerId = offer._id;
            let offerTpl = offer._tpl;
            if (db[offerTpl]) {
                let barter = trader?.assort?.barter_scheme[offerId][0][0];
                let templateItem = db[offerTpl];
                let loyaltyLvl = templateItem?.LoyaltyLevel !== undefined ? templateItem?.LoyaltyLevel : 3;
                if (this.itemDB()[barter?._tpl]?._parent !== ParentClasses.MONEY) {
                    trader.assort.loyal_level_items[offerId] = Math.max(1, loyaltyLvl - 1);
                } else {
                    trader.assort.loyal_level_items[offerId] = Math.min(4, loyaltyLvl);
                }
            }
        }
    }

    public addItemsToAssorts() {
        if (this.modConf.food_changes) {
            this.assortItemPusher(jaegId, "544fb62a4bdc2dfb738b4568", 2, "5449016a4bdc2d6f028b456f", 1, false, 12000);
            this.assortItemPusher(jaegId, "60098b1705871270cd5352a1", 2, "5449016a4bdc2d6f028b456f", 2, false, 18000);
            this.assortItemPusher(jaegId, "5448fee04bdc2dbc018b4567", 2, "5449016a4bdc2d6f028b456f", 3, false, 25000);

            this.assortItemPusher(jaegId, "57347d692459774491567cf1", 2, "5449016a4bdc2d6f028b456f", 1, false, 12000);
            this.assortItemPusher(jaegId, "57347d7224597744596b4e72", 2, "5449016a4bdc2d6f028b456f", 2, false, 15000);
            this.assortItemPusher(jaegId, "590c5d4b86f774784e1b9c45", 2, "5449016a4bdc2d6f028b456f", 3, false, 30000);

            this.assortItemPusher(pkId, "590c5f0d86f77413997acfab", 2, "5696686a4bdc2da3298b456a", 3, false, 250);
        }

        if (this.modConf.med_changes == true) {
            //Skier//
            this.assortItemPusher(skierId, "SJ0", 2, "5449016a4bdc2d6f028b456f", 1, false, 25000);
        }

        if (this.modConf.recoil_attachment_overhaul == true) {
            //jaeger
            this.assortItemPusher(jaegId, "mosin_bayonet", 5, "5449016a4bdc2d6f028b456f", 1, false, 5000);
            this.assortItemPusher(jaegId, "6kh4_bayonet", 5, "5449016a4bdc2d6f028b456f", 1, false, 4000);
            // this.assortBarterPusher(jaegId, "6kh5_bayonet", 1, ["5bffdc370db834001d23eca8"], 1);
            this.assortItemPusher(jaegId, "m9_bayonet", 5, "5449016a4bdc2d6f028b456f", 1, false, 7000);
        }

        if(this.modConf.enable_hazard_zones == true){
            this.assortItemPusher(theraId, "59e7715586f7742ee5789605", 1, "5449016a4bdc2d6f028b456f", 1, false, 15000);
            this.assortItemPusher(jaegId, "590c595c86f7747884343ad7", 1, "5449016a4bdc2d6f028b456f", 3, false, 35000);
            this.assortItemPusher(jaegId, "5b432c305acfc40019478128", 1, "5449016a4bdc2d6f028b456f", 2, false, 20000); 
        }

        //ragman//
        if (this.modConf.realistic_ballistics == true) {
            this.assortItemPusher(ragmId, "xsapi_chest", 1, "5449016a4bdc2d6f028b456f", 4, false, 70000);
            this.assortItemPusher(ragmId, "mk4a_plate", 1, "5449016a4bdc2d6f028b456f", 4, false, 30000);

            // this.assortNestedItemPusher(ragmId, "5ac8d6885acfc400180ae7b0", { "5a16b7e1fcdbcb00165aa6c9": "mod_equipment_000" }, 1, "5449016a4bdc2d6f028b456f", 3, true, undefined, 1.25);
            // this.assortNestedItemPusher(ragmId, "5e00c1ad86f774747333222c", { "5e01f31d86f77465cf261343": "mod_equipment_000" }, 1, "5449016a4bdc2d6f028b456f", 4, true, undefined, 1.25, { "5c0558060db834001b735271": "mod_nvg" });
            // this.assortNestedItemPusher(ragmId, "5ea05cf85ad9772e6624305d", { "5a16badafcdbcb001865f72d": "mod_equipment_000" }, 1, "5449016a4bdc2d6f028b456f", 2, true, undefined, 1.25, { "5ea058e01dbce517f324b3e2": "mod_nvg" });
            // this.assortNestedItemPusher(ragmId, "5aa7cfc0e5b5b00015693143", { "5a16b8a9fcdbcb00165aa6ca": "mod_nvg", "5a16b93dfcdbcbcae6687261": "mod_nvg", "57235b6f24597759bf5a30f1": "mod_nvg" }, 1, "5449016a4bdc2d6f028b456f", 2, true, undefined, 1.3);
        }


        if (this.modConf.recoil_attachment_overhaul == true) {
            //mechanic//
            //guns
            this.assortItemPusher(mechId, "mechOPSKSv1", 1, "5449016a4bdc2d6f028b456f", 2, false, 12500);
            this.assortItemPusher(mechId, "mechSKSv1", 1, "5449016a4bdc2d6f028b456f", 1, false, 10000);
            this.assortItemPusher(mechId, "mechSTM9v1", 1, "5449016a4bdc2d6f028b456f", 3, false, 15000);
            this.assortItemPusher(mechId, "mechSaiga12v1", 1, "5449016a4bdc2d6f028b456f", 3, false, 10000);
            this.assortItemPusher(mechId, "mechM3v1", 1, "5449016a4bdc2d6f028b456f", 4, false, 20000);

            //attachments            
            this.assortItemPusher(mechId, "mechRatWorx", 1, "5449016a4bdc2d6f028b456f", 2, false, 10000);
            this.assortItemPusher(mechId, "mechSKS_366", 1, "5449016a4bdc2d6f028b456f", 1, false, 15000);
            this.assortItemPusher(mechId, "mechVPO_23", 1, "5449016a4bdc2d6f028b456f", 1, false, 15000);
            this.assortItemPusher(mechId, "mechAUG_417", 1, "5449016a4bdc2d6f028b456f", 2, false, 20000);
            this.assortItemPusher(mechId, "mechMDR_406", 1, "5449016a4bdc2d6f028b456f", 2, false, 30000);
            this.assortItemPusher(mechId, "mechSpear_330mm", 1, "5449016a4bdc2d6f028b456f", 2, false, 35000);
            this.assortItemPusher(mechId, "mechMCX_171mm", 1, "5449016a4bdc2d6f028b456f", 2, false, 30000);
            this.assortItemPusher(mechId, "mechMCX_229mm", 1, "5449016a4bdc2d6f028b456f", 2, false, 30000);
            this.assortItemPusher(mechId, "mechAR15_260mm", 1, "5449016a4bdc2d6f028b456f", 2, false, 15000);
            this.assortItemPusher(mechId, "mechSlant_366", 1, "5449016a4bdc2d6f028b456f", 1, false, 2000);
            this.assortItemPusher(mechId, "mechSpikes_366", 1, "5449016a4bdc2d6f028b456f", 2, false, 5000);
            this.assortItemPusher(mechId, "mechDTK_366", 1, "5449016a4bdc2d6f028b456f", 3, false, 10000);
            this.assortItemPusher(mechId, "mechJMAC_366", 1, "5449016a4bdc2d6f028b456f", 4, false, 20000);

            //skier//
            //guns
            this.assortItemPusher(skierId, "Skier209", 1, "5449016a4bdc2d6f028b456f", 1, false, 12500);
        }
        //scopes
        this.assortNestedItemPusher(mechId, "616584766ef05c2ce828ef57", { "5c7d560b2e22160bc12c6139": "mod_scope", "5c7d55de2e221644f31bff68": "mod_scope" }, 1, "5449016a4bdc2d6f028b456f", 2, true, undefined, 1.25);
        this.assortNestedItemPusher(mechId, "58d39d3d86f77445bb794ae7", { "58d39b0386f77443380bf13c": "mod_scope", "58d399e486f77442e0016fe7": "mod_scope" }, 1, "5449016a4bdc2d6f028b456f", 3, true, undefined, 1.25);
        this.assortNestedItemPusher(mechId, "58d39d3d86f77445bb794ae7", { "58d399e486f77442e0016fe7": "mod_scope" }, 1, "5449016a4bdc2d6f028b456f", 3, true, undefined, 1.1);
        this.assortNestedItemPusher(mechId, "5b31163c5acfc400153b71cb", { "5b3116595acfc40019476364": "mod_scope" }, 1, "5449016a4bdc2d6f028b456f", 2, true, undefined, 1.1);
        this.assortNestedItemPusher(mechId, "5a33b2c9c4a282000c5a9511", { "5a32aa8bc4a2826c6e06d737": "mod_scope" }, 1, "5449016a4bdc2d6f028b456f", 4, true, undefined, 1.1);
        this.assortNestedItemPusher(mechId, "58d2664f86f7747fec5834f6", { "58d268fc86f774111273f8c2": "mod_scope" }, 1, "5449016a4bdc2d6f028b456f", 2, true, undefined, 1.1);
        this.assortNestedItemPusher(mechId, "577d128124597739d65d0e56", { "577d141e24597739c5255e01": "mod_scope" }, 1, "5449016a4bdc2d6f028b456f", 2, true, undefined, 1.1);
        this.assortNestedItemPusher(mechId, "5b2389515acfc4771e1be0c0", { "5b2388675acfc4771e1be0be": "mod_scope_000" }, 1, "5449016a4bdc2d6f028b456f", 3, true, undefined, 1.1);
        this.assortNestedItemPusher(mechId, "5a37ca54c4a282000d72296a", { "5b3b99475acfc432ff4dcbee": "mod_scope_000" }, 1, "5449016a4bdc2d6f028b456f", 4, true, undefined, 1.1, { "58d268fc86f774111273f8c2": "mod_scope_001" });
        this.assortNestedItemPusher(mechId, "618bab21526131765025ab3f", { "618ba27d9008e4636a67f61d": "mod_scope" }, 1, "5449016a4bdc2d6f028b456f", 4, true, undefined, 1.1, { "618ba92152ecee1505530bd3": "mod_mount", "5a32aa8bc4a2826c6e06d737": "mod_scope" });
    }

    private assortNestedItemPusher(trader: string, itemId: string, nestedChildItems: Record<string, string>, buyRestriction: number, saleCurrency: string, loyalLvl: number, useHandbook: boolean, price: number = 0, priceMulti: number = 1, secondaryChildItems?: Record<string, string>,) {

        let assort = this.tables.traders[trader].assort;
        let assortId = this.utils.genId();
        let parent = assortId;
        let idArr = [];

        if (useHandbook == true) {
            idArr.push(itemId);
            for (let key in nestedChildItems) {
                idArr.push(key);
            }
            for (let key in secondaryChildItems) {
                idArr.push(key);
            }

            for (let item in idArr) {
                price += this.handBookPriceLookup(idArr[item]);
            }
        }

        this.assortPusherHelper(assort, assortId, price, saleCurrency, loyalLvl, itemId, buyRestriction, priceMulti);


        for (let key in nestedChildItems) {
            let id = this.utils.genId();
            assort.items.push(
                {
                    "_id": id,
                    "_tpl": key,
                    "parentId": parent,
                    "slotId": nestedChildItems[key]
                }
            );
            parent = id;
        }

        if (secondaryChildItems !== undefined) {
            for (let key in secondaryChildItems) {
                let id = this.utils.genId();
                assort.items.push(
                    {
                        "_id": id,
                        "_tpl": key,
                        "parentId": assortId,
                        "slotId": secondaryChildItems[key]
                    }
                );
                assortId = id;
            }
        }
    }

    private assortBarterPusher(trader: string, itemId: string, buyRestriction: number, barters: string[], loyalLvl: number) {

        let assort = this.tables.traders[trader].assort;
        let assortId = this.utils.genId();

        this.assortBarterHelper(assort, assortId, barters, loyalLvl, itemId, buyRestriction);

    }

    private assortBarterHelper(assort: ITraderAssort, assortId: string, barters: string[], loyalLvl: number, itemId: string, buyRestriction: number) {

        if (loyalLvl === 5 && modConfig.randomize_trader_ll != true) {
            loyalLvl = 4;
        }

        assort.items.push(
            {
                "_id": assortId,
                "_tpl": itemId,
                "parentId": "hideout",
                "slotId": "hideout",
                "upd": {
                    "StackObjectsCount": buyRestriction
                }
            }
        );

        let barterItems = [];

        for (let barter in barters) {

            barterItems.push(
                {
                    "count": 1,
                    "_tpl": barters[barter]
                }
            );
        }

        assort.barter_scheme[assortId] =
            [
                barterItems
            ];


        assort.loyal_level_items[assortId] = loyalLvl;
    }

    private assortItemPusher(trader: string, itemId: string, buyRestriction: number, saleCurrency: string, loyalLvl: number, useHandbookPrice: boolean, price: number = 0, priceMulti: number = 1) {

        let assort = this.tables.traders[trader].assort;
        let assortId = this.utils.genId();

        if (useHandbookPrice == true) {
            price += this.handBookPriceLookup(itemId);
        }

        this.assortPusherHelper(assort, assortId, price, saleCurrency, loyalLvl, itemId, buyRestriction, priceMulti);

    }

    private handBookPriceLookup(itemId: string): number {
        let item = this.tables.templates.handbook.Items.find(i => i.Id === itemId);
        return item.Price;
    }

    private assortPusherHelper(assort: ITraderAssort, assortId: string, price: number, saleCurrency: string, loyalLvl: number, itemId: string, buyRestriction: number, priceMulti: number) {

        price *= priceMulti;

        if (loyalLvl === 5 && modConfig.randomize_trader_ll != true) {
            loyalLvl = 4;
        }

        assort.items.push(
            {
                "_id": assortId,
                "_tpl": itemId,
                "parentId": "hideout",
                "slotId": "hideout",
                "upd": {
                    "StackObjectsCount": buyRestriction
                }
            }
        );

        assort.barter_scheme[assortId] =
            [
                [
                    {
                        "count": price,
                        "_tpl": saleCurrency
                    }
                ]
            ];


        assort.loyal_level_items[assortId] = loyalLvl;
    }
}


export class RandomizeTraderAssort {

    constructor() { }
    private databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
    private logger = container.resolve<ILogger>("WinstonLogger");
    private tables = this.databaseServer.getTables();
    private itemDB = this.tables.templates.items;
    private arrays = new Arrays(this.tables);
    private utils = new Utils(this.tables, this.arrays);


    public getAverageLL(pmcData: IPmcData[], traderId: string): number {

        let totalLL = 0;
        let playerCount = 0;

        pmcData.forEach(element => {
            playerCount++;
            if (element?.TradersInfo != null && element?.TradersInfo != undefined) {
                let ll = element?.TradersInfo[traderId]?.loyaltyLevel;
                totalLL += ll !== null && ll !== undefined ? ll : 1;
            }
            totalLL += 1;
        });

        let avgLL = totalLL / playerCount;

        if (modConfig.logEverything) {
            this.logger.logWithColor(`Realism Mod: average LL for trader ${this.tables.traders[traderId].base.nickname} is ${avgLL}}`, LogTextColor.GREEN);
        }

        return avgLL;
    }


    public adjustTraderStockAtServerStart(pmcData: IPmcData[]) {
        if (EventTracker.isChristmas == true) {
            this.logger.warning("====== Christmas Sale, Everything 15% Off! ======");
        }
        for (let trader in this.tables.traders) {
            if (this.tables.traders[trader].assort?.items !== undefined && this.tables.traders[trader].base.nickname !== "БТР" && this.tables.traders[trader].base.nickname.toLocaleLowerCase() !== "fence") {
                let assortItems = this.tables.traders[trader].assort.items;
                let ll = this.getAverageLL(pmcData, trader);
                for (let item in assortItems) {
                    let assortItem = assortItems[item];
                    let itemId = assortItem._id;
                    let itemTemplId =assortItem._tpl;
                    if (modConfig.randomize_trader_stock == true) {
                        if (assortItem.upd?.StackObjectsCount !== undefined) {
                            this.randomizeStockHelper(assortItem, ll);
                        }
                        if (assortItem.upd?.UnlimitedCount !== undefined) {
                            assortItem.upd.UnlimitedCount = false;
                        }
                    }
                    if (modConfig.randomize_trader_prices == true || modConfig.adjust_trader_prices) {
                        if (this.tables.traders[trader]?.assort?.barter_scheme) {
                            let barter = this.tables.traders[trader].assort.barter_scheme[itemId];
                            if (barter !== undefined) {
                                this.setAndRandomizeCost(this.utils, itemTemplId, barter, true);
                            }
                        }
                    }
                }
            }
            if (modConfig.randomize_trader_ll == true) {
                if (this.tables.traders[trader].assort?.loyal_level_items !== undefined) {
                    let ll = this.tables.traders[trader].assort.loyal_level_items;
                    for (let lvl in ll) {
                        this.randomizeLL(ll, lvl, this.logger);
                    }
                }
            }

        }
    }

    private getLLStackableBonus(ll: number): number {
        switch (ll) {
            case 1:
                return 1;
            case 2:
                return 1.05;
            case 3:
                return 1.12;
            case 4:
                return 1.25;
        }
        return 1;
    }

    private getLLOutOfStockBonus(ll: number) {
        switch (ll) {
            case 1:
            case 2:
                return 0;
            case 3:
                return 1;
            case 4:
                return 2;
        }
        return 0;
    }

    public randomizeStockHelper(item: Item, averageLL: number) {
        let itemParent = this.itemDB[item._tpl]?._parent;
        if (!itemParent) {
            this.logger.warning(`Realism Mod: Unable to randomize stock for: ${item._tpl}, has no _parent / item does not exist in db`);
            return;
        }

        const llStockFactor = Math.max(averageLL - 1, 1);
        const llStackableFactor = this.getLLStackableBonus(averageLL);
        const llOutOfStockFactor = this.getLLOutOfStockBonus(averageLL);

        //ammo
        this.randomizeAmmoStock(itemParent, item, llStackableFactor, llOutOfStockFactor);
        this.randomizeStock(itemParent, ParentClasses.AMMO_BOX, item, 0 + modConfig.rand_stock_modifier_min, 2 + modConfig.rand_stock_modifier, llOutOfStockFactor);

        //weapons
        for (let id in this.arrays.weaponParentIDs) {
            this.randomizeStock(itemParent, this.arrays.weaponParentIDs[id], item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);
        }

        //weapon mods
        for (let id in this.arrays.modParentIDs) {
            this.randomizeStock(itemParent, this.arrays.modParentIDs[id], item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);
        }

        //gear
        for (let id in this.arrays.gearParentIDs) {
            this.randomizeStock(itemParent, this.arrays.gearParentIDs[id], item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);
        }

        //barter items
        for (let id in this.arrays.barterParentIDs) {
            this.randomizeStock(itemParent, this.arrays.barterParentIDs[id], item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);
        }

        //keys 
        for (let id in this.arrays.keyParentIDs) {
            this.randomizeStock(itemParent, this.arrays.keyParentIDs[id], item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);
        }

        //maps
        this.randomizeStock(itemParent, ParentClasses.MAP, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);

        //nvg + thermals:
        this.randomizeStock(itemParent, ParentClasses.NIGHTVISION, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);
        this.randomizeStock(itemParent, ParentClasses.SPECIAL_SCOPE, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);
        this.randomizeStock(itemParent, ParentClasses.THEMALVISION, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);

        //magazine
        if (itemParent === ParentClasses.MAGAZINE) {
            let magCap = this.itemDB[item._tpl]?._props?.Cartridges[0]._max_count;
            if (magCap <= 35) {
                this.randomizeStock(itemParent, ParentClasses.MAGAZINE, item, 0 + modConfig.rand_stock_modifier_min, 3 + modConfig.rand_stock_modifier + llStockFactor, llOutOfStockFactor);
            } else if (magCap > 35 && magCap <= 45) {
                this.randomizeStock(itemParent, ParentClasses.MAGAZINE, item, 0 + modConfig.rand_stock_modifier_min, 2 + modConfig.rand_stock_modifier + llStockFactor, llOutOfStockFactor);
            }
            else {
                this.randomizeStock(itemParent, ParentClasses.MAGAZINE, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier + llStockFactor, llOutOfStockFactor);
            }
        }

        //medical
        this.randomizeStock(itemParent, ParentClasses.STIMULATOR, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);
        this.randomizeStock(itemParent, ParentClasses.DRUGS, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier + llStockFactor, llOutOfStockFactor);
        this.randomizeStock(itemParent, ParentClasses.MEDICAL, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier + llStockFactor, llOutOfStockFactor);

        //special items
        this.randomizeStock(itemParent, ParentClasses.SPEC_ITEM, item, 3 + modConfig.rand_stock_modifier_min, 3 + modConfig.rand_stock_modifier + llStockFactor, llOutOfStockFactor);
        this.randomizeStock(itemParent, ParentClasses.PORTABLE_RANGE_FINDER, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);
        this.randomizeStock(itemParent, ParentClasses.COMPASS, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);

        //grenades
        this.randomizeStock(itemParent, ParentClasses.THROW_WEAPON, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier + llStockFactor, llOutOfStockFactor);

        //money
        this.randomizeStock(itemParent, ParentClasses.MONEY, item, 1500 * modConfig.rand_stock_modifier_min, 150000 * modConfig.rand_stackable_modifier, llOutOfStockFactor);

        //container
        this.randomizeStock(itemParent, ParentClasses.SIMPLE_CONTAINER, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);
        this.randomizeStock(itemParent, ParentClasses.LOCKABLE_CONTAINER, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier, llOutOfStockFactor);

        //provisions
        this.randomizeStock(itemParent, ParentClasses.FOOD, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier + llStockFactor, llOutOfStockFactor);
        this.randomizeStock(itemParent, ParentClasses.DRINK, item, 0 + modConfig.rand_stock_modifier_min, 1 + modConfig.rand_stock_modifier + llStockFactor, llOutOfStockFactor);
    }

    private randomizeAmmoStock(assortItemParent: string, item: Item, llStackableFactor: number, llStockFactor: number) {

        if (assortItemParent === ParentClasses.AMMO && item.slotId !== "cartridges") {
            let llOutOfStockFactor = llStockFactor * 10;
            this.randomizeAmmoStockHelper(item, Calibers._9x18mm, 40 * modConfig.rand_stackable_modifier * llStackableFactor, 110 * modConfig.rand_stackable_modifier * llStackableFactor, 15 - llOutOfStockFactor, 20);
            this.randomizeAmmoStockHelper(item, Calibers._9x19mm, 30 * modConfig.rand_stackable_modifier * llStackableFactor, 95 * modConfig.rand_stackable_modifier * llStackableFactor, 30 - llOutOfStockFactor, 50, 58);
            this.randomizeAmmoStockHelper(item, Calibers._9x21mm, 25 * modConfig.rand_stackable_modifier * llStackableFactor, 85 * modConfig.rand_stackable_modifier * llStackableFactor, 40 - llOutOfStockFactor, 50);
            this.randomizeAmmoStockHelper(item, Calibers._9x39mm, 30 * modConfig.rand_stackable_modifier * llStackableFactor, 90 * modConfig.rand_stackable_modifier * llStackableFactor, 45 - llOutOfStockFactor, 55);
            this.randomizeAmmoStockHelper(item, Calibers._45ACP, 30 * modConfig.rand_stackable_modifier * llStackableFactor, 95 * modConfig.rand_stackable_modifier * llStackableFactor, 30 - llOutOfStockFactor, 49, 55);
            this.randomizeAmmoStockHelper(item, Calibers._357mag, 10 * modConfig.rand_stackable_modifier * llStackableFactor, 30 * modConfig.rand_stackable_modifier * llStackableFactor, 30 - llOutOfStockFactor, 0, 120);
            this.randomizeAmmoStockHelper(item, Calibers._46x30mm, 20 * modConfig.rand_stackable_modifier * llStackableFactor, 110 * modConfig.rand_stackable_modifier * llStackableFactor, 35 - llOutOfStockFactor, 50);
            this.randomizeAmmoStockHelper(item, Calibers._57x28mm, 20 * modConfig.rand_stackable_modifier * llStackableFactor, 110 * modConfig.rand_stackable_modifier * llStackableFactor, 35 - llOutOfStockFactor, 50);
            this.randomizeAmmoStockHelper(item, Calibers._762x25mm, 40 * modConfig.rand_stackable_modifier * llStackableFactor, 100 * modConfig.rand_stackable_modifier * llStackableFactor, 20 - llOutOfStockFactor, 50);
            this.randomizeAmmoStockHelper(item, Calibers._366TKM, 40 * modConfig.rand_stackable_modifier * llStackableFactor, 110 * modConfig.rand_stackable_modifier * llStackableFactor, 30 - llOutOfStockFactor, 55, 110);
            this.randomizeAmmoStockHelper(item, Calibers._762x39mm, 30 * modConfig.rand_stackable_modifier * llStackableFactor, 85 * modConfig.rand_stackable_modifier * llStackableFactor, 45 - llOutOfStockFactor, 55, 95);
            this.randomizeAmmoStockHelper(item, Calibers._68x51mm, 15 * modConfig.rand_stackable_modifier * llStackableFactor, 60 * modConfig.rand_stackable_modifier * llStackableFactor, 50 - llOutOfStockFactor);
            this.randomizeAmmoStockHelper(item, Calibers._762x51mm, 20 * modConfig.rand_stackable_modifier * llStackableFactor, 65 * modConfig.rand_stackable_modifier * llStackableFactor, 60 - llOutOfStockFactor, 60, 120);
            this.randomizeAmmoStockHelper(item, Calibers._762x54rmm, 25 * modConfig.rand_stackable_modifier * llStackableFactor, 70 * modConfig.rand_stackable_modifier * llStackableFactor, 55 - llOutOfStockFactor, 65, 120);
            this.randomizeAmmoStockHelper(item, Calibers._300BLK, 20 * modConfig.rand_stackable_modifier * llStackableFactor, 100 * modConfig.rand_stackable_modifier * llStackableFactor, 45 - llOutOfStockFactor, 53, 100);
            this.randomizeAmmoStockHelper(item, Calibers._556x45mm, 20 * modConfig.rand_stackable_modifier * llStackableFactor, 90 * modConfig.rand_stackable_modifier * llStackableFactor, 50 - llOutOfStockFactor, 60, 100);
            this.randomizeAmmoStockHelper(item, Calibers._545x39mm, 40 * modConfig.rand_stackable_modifier * llStackableFactor, 100 * modConfig.rand_stackable_modifier * llStackableFactor, 50 - llOutOfStockFactor, 60, 100);
            this.randomizeAmmoStockHelper(item, Calibers._127x55mm, 10 * modConfig.rand_stackable_modifier * llStackableFactor, 90 * modConfig.rand_stackable_modifier * llStackableFactor, 40 - llOutOfStockFactor, 51);
            this.randomizeAmmoStockHelper(item, Calibers._12ga, 10 * modConfig.rand_stackable_modifier * llStackableFactor, 20 * modConfig.rand_stackable_modifier * llStackableFactor, 20 - llOutOfStockFactor, 35, 150);
            this.randomizeAmmoStockHelper(item, Calibers._20ga, 20 * modConfig.rand_stackable_modifier * llStackableFactor, 40 * modConfig.rand_stackable_modifier * llStackableFactor, 10 - llOutOfStockFactor);
            this.randomizeAmmoStockHelper(item, Calibers._23x75mm, 3 * modConfig.rand_stackable_modifier * llStackableFactor, 15 * modConfig.rand_stackable_modifier * llStackableFactor, 50 - llOutOfStockFactor);
            this.randomizeAmmoStockHelper(item, Calibers._26x75mm, 1 * modConfig.rand_stackable_modifier * llStackableFactor, 2 * modConfig.rand_stackable_modifier * llStackableFactor, 50 - llOutOfStockFactor);
            this.randomizeAmmoStockHelper(item, Calibers._40x46mm, 1 * modConfig.rand_stackable_modifier * llStackableFactor, 3 * modConfig.rand_stackable_modifier * llStackableFactor, 55 - llOutOfStockFactor);
            this.randomizeAmmoStockHelper(item, Calibers._40x53mm, 1 * modConfig.rand_stackable_modifier * llStackableFactor, 3 * modConfig.rand_stackable_modifier * llStackableFactor, 55 - llOutOfStockFactor);
            this.randomizeAmmoStockHelper(item, Calibers._338mag, 5 * modConfig.rand_stackable_modifier * llStackableFactor, 30 * modConfig.rand_stackable_modifier * llStackableFactor, 50 - llOutOfStockFactor, 70, 120);
        }
    }

    private randomizeAmmoStockHelper(item: Item, caliber: string, min: number, max: number, outOfStockChance: number, penThreshold: number = 0, damageThreshold: number = 0) {
        if (this.itemDB[item._tpl]._props.Caliber === caliber) {
            let oddsModifier = 1;
            let stockModifier = 1;
            let damage = this.itemDB[item._tpl]._props.Damage * this.itemDB[item._tpl]._props.ProjectileCount;
            const useDamageInstead = damageThreshold > 0 && damage >= damageThreshold;

            if (penThreshold > 0 && !useDamageInstead) {
                let pen = this.itemDB[item._tpl]._props.PenetrationPower;
                stockModifier *= penThreshold / pen;
                oddsModifier *= pen / penThreshold;
            }
            if (useDamageInstead) {
                stockModifier *= damageThreshold / damage;
                oddsModifier *= damage / damageThreshold;
            }
            let randNum = this.utils.pickRandNumInRange(0, 100);
            if (randNum <= (outOfStockChance * oddsModifier)) {
                item.upd.StackObjectsCount = 0;
            }
            else {
                let modifiedStackCount = Math.round(this.utils.pickRandNumInRange(min * stockModifier, max * stockModifier));
                item.upd.StackObjectsCount = Math.round(Math.min(modifiedStackCount, max * 1.2));
            }

            if (item.upd.hasOwnProperty('BuyRestrictionCurrent')) {
                delete item.upd.BuyRestrictionCurrent;
            }
            if (item.upd.hasOwnProperty('BuyRestrictionMax')) {
                delete item.upd.BuyRestrictionMax;
            }
        }
    }

    //re-roll based on ll level
    private getStockCount(allowedAttemps: number, attempt: number, min: number, max: number): number {
        let stockCount = this.utils.pickRandNumInRange(min, max);
        if (stockCount == 0 && attempt < allowedAttemps) {
            return this.getStockCount(allowedAttemps, attempt + 1, min, max);
        }
        else {
            return stockCount;
        }
    }

    private randomizeStock(assortItemParent: string, catParent: string, item: Item, min: number, max: number, llFactor: number) {
        if (assortItemParent === catParent) {

            //items aren't out of stock often enough, this artifically increases the chance of being out of stock
            if (this.utils.pickRandNumOneInTen() < (4 - llFactor)) {
                item.upd.StackObjectsCount = 0 + min;
            }
            else {
                item.upd.StackObjectsCount = this.getStockCount(llFactor, 0, min, max);
            }

            if (item.upd.hasOwnProperty('BuyRestrictionCurrent')) {
                delete item.upd.BuyRestrictionCurrent;
            }
            if (item.upd.hasOwnProperty('BuyRestrictionMax')) {
                delete item.upd.BuyRestrictionCurrent;
            }
        }
    }

    public setAndRandomizeCost(utils: Utils, itemTemplId: string, barter: IBarterScheme[][], setBasePrice: boolean) {
       
        let barterItem = barter[0][0];
        if (this.itemDB[barterItem._tpl]._parent === ParentClasses.MONEY) {
            let randNum = utils.pickRandNumOneInTen();
            let cost = barterItem.count;
            if (setBasePrice == true && modConfig.adjust_trader_prices == true) {
                this.adjustPriceByCategory(barterItem, itemTemplId, cost);
            }
            if (modConfig.randomize_trader_prices == true) {
                if (randNum >= 8) {
                    barterItem.count = cost * modConfig.rand_cost_increase;
                }
                else if (randNum <= 3) {
                    barterItem.count = cost * modConfig.rand_cost_discount;
                }
            }
            if (EventTracker.isChristmas == true) {
                barterItem.count = barterItem.count * 0.85;
            }
        }
    }

    private adjustPriceByCategory(barter: IBarterScheme, itemTemplId: string, cost: number) {
        if (this.itemDB[itemTemplId]._parent === ParentClasses.AMMO) {
            barter.count = cost * 2;
        }
        if (this.itemDB[itemTemplId]._parent === ParentClasses.AMMO_BOX) {
            barter.count = cost * 2;
        }
        if (this.itemDB[itemTemplId]._parent === ParentClasses.DRUGS) {
            barter.count = cost * 1.5;
        }
        if (this.itemDB[itemTemplId]._parent === ParentClasses.MEDKIT) {
            barter.count = cost * 1.5;
        }
        if (this.itemDB[itemTemplId]._parent === ParentClasses.MEDS) {
            barter.count = cost * 1.5;
        }
        if (this.itemDB[itemTemplId]._parent === ParentClasses.STIMULATOR) {
            barter.count = cost * 1.5;
        }
        if (this.itemDB[itemTemplId]._parent === ParentClasses.MEDICAL_SUPPLIES) {
            barter.count = cost * 1.5;
        }
        if (this.itemDB[itemTemplId]._parent === ParentClasses.FOOD) {
            barter.count = cost * 1.5;
        }
        if (this.itemDB[itemTemplId]._parent === ParentClasses.DRINK) {
            barter.count = cost * 1.5;
        }
        if (this.itemDB[itemTemplId]._parent === ParentClasses.HEADWEAR) {
            barter.count = cost * 0.6;
        }
        if (this.itemDB[itemTemplId]._parent === ParentClasses.ARMOREDEQUIPMENT) {
            barter.count = cost * 0.6;
        }
    }

    public randomizeLL(ll: Record<string, number>, i: string, logger: ILogger) {
        let level = ll[i];
        let randNum = this.utils.pickRandNumOneInTen();
        if (randNum <= 2) {
            ll[i] = Math.max(1, level - 1);
        }
        if (level === 5) {
            ll[i] = 4;
        }
    }
}

export class RagCallback extends RagfairCallbacks {

    public mySearch(url: string, info: ISearchRequestData, sessionID: string): IGetBodyResponseData<IGetOffersResult> {
        this.httpResponse.getBody(this.ragfairController.getOffers(sessionID, info))
        return this.httpResponse.getBody(this.ragfairController.getOffers(sessionID, info));
    }
}


export class TraderRefresh extends TraderAssortHelper {

    pristineAssorts: Record<string, ITraderAssort>;

    public myResetExpiredTrader(trader: ITrader) {

        if (trader.base.nickname === "БТР") return;

        const traderId = trader.base._id;
        trader.assort = this.cloner.clone(this.traderAssortService.getPristineTraderAssort(traderId));

        let pmcData: IPmcData[] = [];

        ProfileTracker.profileIds.forEach(element => {
            pmcData.push(this.profileHelper.getPmcProfile(element));
        });

        if (modConfig.randomize_trader_prices == true || modConfig.randomize_trader_stock == true || modConfig.randomize_trader_ll == true) {
            trader.assort.items = this.modifyTraderAssorts(trader, this.logger, pmcData);
        }

        trader.base.nextResupply = this.traderHelper.getNextUpdateTimestamp(trader.base._id);

        trader.base.refreshTraderRagfairOffers = true;

        //seems like manually refreshing ragfair is necessary. 
        this.ragfairOfferGenerator.generateFleaOffersForTrader(trader.base._id);

    }

    private modifyTraderAssorts(trader: ITrader, logger: ILogger, pmcData: IPmcData[]): Item[] {
        const tables = this.databaseService.getTables();
        const randomTraderAss = new RandomizeTraderAssort();
        const arrays = new Arrays(tables);
        const utils = new Utils(tables, arrays);

        let assortItems = trader.assort.items;
        let assortBarters = trader.assort.barter_scheme;
        let averageLL = randomTraderAss.getAverageLL(pmcData, trader.base._id);

        if (modConfig.randomize_trader_ll == true) {
            let ll = trader.assort.loyal_level_items;
            for (let lvl in ll) {
                randomTraderAss.randomizeLL(ll, lvl, logger);
            }
        }
        for (let i in assortItems) {
            let item = assortItems[i];
            let itemId = assortItems[i]._id;
            let itemTemplId = assortItems[i]._tpl;
            if (modConfig.randomize_trader_stock == true) {
                if (item.upd?.StackObjectsCount !== undefined) {
                    randomTraderAss.randomizeStockHelper(item, averageLL);
                }
                if (item.upd?.UnlimitedCount !== undefined) {
                    item.upd.UnlimitedCount = false;
                }
                if (item.upd?.BuyRestrictionCurrent !== undefined) {
                    item.upd.BuyRestrictionCurrent = 0;
                }
            }
            if (modConfig.randomize_trader_prices == true) {
                let barter = assortBarters[itemId];
                if (barter !== undefined) {
                    //roll randomization of prices several times for better potential spread of prices...nah, that seems really stupid
                    this.randomizePricesAtRefresh(randomTraderAss, utils, itemTemplId, barter);
                }
            }
        }
        return assortItems;
    }

    private randomizePricesAtRefresh(randomTraderAss: RandomizeTraderAssort, utils: Utils, itemTemplId: string, barter: IBarterScheme[][]): void {
        randomTraderAss.setAndRandomizeCost(utils, itemTemplId, barter, true);
    }
}
