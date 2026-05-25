/* shop2.c */
#include "/zone/null/eternal/eternal.h"
 
inherit RoomCode;
 
#define SHOPKEEPER "/zone/null/eternal/monsters/gwain_shopkeeper.c"

void extra_create()
{
    object shop;
 
    set( "map_symbol", "PCA" );
    set( "map_hint_x", -1 );
    set( "short", "Paranoid Clothing & Apparel");
    set( "day_long",
      "This is a small, messy store where piles of clothing, "+
      "apparel, and other worn items have been hung, lain, or"+
      "strewn about the room in a general disarray.  "+
      "Interestingly, you find that a lot of the apparel here does "+
      "not consist of your typical T-shirt and shorts selection "+
      "like most stores, but pieces of thick leather, metal "+
      "plates, bulletproof vests, and the like.  This is "+
      "definitely the place to shop if you are paranoid and need "+
      "a little something extra to feel safe!" );
    set( "day_light", WELL_LIT );
    set( "exits", ([
      "south" : "room011"
    ]) );

    shop = clone_object( ShopCode );
    shop->set( "owner_name", "Gwain" );
    shop->set( "active_owner", 1 );
    shop->set_sign_header( "PARANOID CLOTHING & APPAREL" );
    shop->set( "short", "a sign posted to the wall" );
    shop->add( "valid_properties", ({ ArmorP }) );
    shop->add_item(ARMORDIR + "breastplates/chain_short_shirt", 3, 60);
    shop->add_item(ARMORDIR + "breastplates/scale_short_shirt", 2, 25);
    shop->add_item(ARMORDIR + "breastplates/soft_leather_short_shirt", 6, 60);
    shop->add_item(ARMORDIR + "breastplates/padded_short_shirt", 5, 40);
    shop->add_item(ARMORDIR + "helmets/leather_cap", 3, 35);
    shop->add_item(ARMORDIR + "helmets/leather_helmet_open", 1, 25);
    shop->add_item(ARMORDIR + "leggings/leather_leggings", 2, 25);
    shop->add_item(ARMORDIR + "leggings/soft_leather_leggings", 3, 30);
    shop->add_item(ARMORDIR + "sleeves/soft_leather_sleeves", 3, 30);
    shop->add_item(ARMORDIR + "sleeves/studded_leather_sleeves", 1, 25);
    shop->add_item(ARMORDIR + "gauntlets/chain_gauntlets", 1, 15);
    shop->add_item(ARMORDIR + "gauntlets/soft_leather_gloves", 6, 50);
    shop->add_item(ARMORDIR + "boots/soft_leather_shoes", 5, 50);
    shop->add_item(ARMORDIR + "boots/leather_boots", 3, 30);
    shop->add_item(ARMORDIR + "boots/chain_boots", 1, 15);
    shop->add_item(ARMORDIR + "shields/small_wooden", 3, 30);
    shop->add_item(ARMORDIR + "race/parthan/leather_sharv", 10, 30);
    shop->add_item(ARMORDIR + "race/parthan/chain_sharv", 10, 30);
    shop->add_item(ARMORDIR + "race/parthan/plate_sharv", 10, 30);
    shop->add_item(ARMORDIR + "race/centaur/barding.c", 5, 30);
    shop->add_item(ARMORDIR + "race/centaur/centaur_ch_boots.c", 5, 30);
    shop->add_item(ARMORDIR + "race/centaur/centaur_chestplate", 5, 30);
    shop->add_item(ARMORDIR + "race/centaur/centaur_f_chain", 5, 30);
    shop->add_item(ARMORDIR + "race/centaur/centaur_f_leather", 5, 30);
    shop->add_item(ARMORDIR + "race/centaur/centaur_f_plate", 5, 30);
    shop->add_item(ARMORDIR + "race/centaur/centaur_leather_boots", 5, 30);
    shop->add_item(ARMORDIR + "race/centaur/centaur_pl_boots", 5, 30);
    move_object(shop, THISO);

    set( "reset_data", ([
      "shopkeeper" : SHOPKEEPER,
      "mirror" : "/zone/null/eternal/objects/magmirror"
    ]) );

   set( InsideP, 1 );
}
