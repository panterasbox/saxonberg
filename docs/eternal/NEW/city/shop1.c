//  shop1.c

inherit RoomPlusCode;

#include "/zone/null/eternal/eternal.h"

void extra_create()
{
    object shop;

    set( "short", "Everything Inc." );
    set( "day_long",
      "You are in a large warehouse lit by numerous fluorescent lights " +
      "hanging from the ceiling above.  Multitudes of large metal racks " +
      "line the floor of this store in rows, with everything from " +
      "antibiotics to zippers hanging from them.  There is usually a " +
      "woman in a red uniform with the words 'Everything Inc.' written " +
      "across the back around here, who will walk up to you and say, " +
      "\"Hi!  Need any help?\"" );
    set( "day_light", WELL_LIT );

    set( "exits", ([
      "east": "room017" ]) );

    set( "descs", ([
      ({ "lights", "fluorescent lights", "numerous fluorescent lights" }):
          "The numerous lights keep the warehouse very well lit.",
      ({ "racks", "metal racks", "large metal racks", "floor", "rows" }):
          "All these many racks are here to hold the many assortment of " +
          "items that are bought and sold here on a daily basis.",
      ({ "antibiotics", "zippers" }):
          "These are just some of the junk sold here."
    ]) );

    shop = clone_object( ShopCode );
    shop->set("owner_name","Sandy");
    shop->set("active_owner",1);
    shop->set("sign_header","EVERYTHING INC." );
    shop->set( "short", "a sign hanging from the ceiling" );
    move_object( shop, THISO );
    shop->add_item( ARMORDIR + "clothing/breeches", 3, 50 );
    shop->add_item( ARMORDIR + "clothing/t_shirt", 10, 60 );
    shop->add_item( ARMORDIR + "clothing/chemise", 2, 30 );
    shop->add_item( ARMORDIR + "clothing/hooded_cloak", 3, 30 );
/*
    shop->add_item( ARMORDIR + "clothing/tabard", 5, 25 );
*/
    shop->add_item( ARMORDIR + "boots/soft_leather_shoes", 3, 6 );
    shop->add_item( WEAPONDIR + "edged/small_knife", 6, 40 );
    shop->add_item( WEAPONDIR + "blunt/skinny_club", 3, 30 );
    shop->add_item( WEAPONDIR + "blunt/quarterstaff", 2, 50 );

    set( "reset_data", ([
      "scale": OBJECTS + "scale",
      "sandy": MONSTERS + "sandy_shopkeeper"
    ]) );
}
