//  magic_shop.c
// Magic shop.  Death 3/24/94
// I shouldn't have to say this but don't fuck with this unless you have a
// clue.  Mail me, I am usually on.


inherit RoomCode;

#include "/zone/null/stuff/inc/stuff.h"
#define SHOPKEEPER  "/zone/null/eternal/monsters/spectre_shopkeeper.c"
#define SIGN_FILE   "/zone/null/eternal/objects/magic_sign"
#define MAGICDIR    "/zone/null/eternal/magic/"


object shop;
#include "/zone/null/eternal/objects/sanctuary.h"

void extra_create()
{
    set( "short", "The Stuff Outlet Store (formerly Athenaeum Magica)" );
    set( "day_long", 
      "This dark and musty room is where Stuff, Inc. used to sell off the "
      "trinkets that the mages create.  However, certain production and "
      "safety issues of late have caused the store to cease its activities." );
    set( "day_light", PART_LIT );

    set( "exits", ([ "up": "magic1" ]) );

    shop = clone_object( ShopCode );
    move_object(shop, THISO);
    set( "reset_data", ([ "shoppie" : SHOPKEEPER,
                          "note" : "/zone/null/eternal/magic/note",
                          "note2" : "/zone/null/eternal/magic/note2" ]) );
    shop->set("no_sell", 1);
    StuffServer->register_shop(shop);
}

