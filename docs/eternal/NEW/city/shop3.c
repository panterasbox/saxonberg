/* shop3.c */
 
inherit RoomCode;
 
#include "/zone/null/eternal/eternal.h"
#define SHOPKEEPER MONSTERS + "kalar_shopkeeper.c"

extra_create()
{
    object shop;
 
    set( "short", "Anarchy Interdimensional");
    set( "day_long", 
      "This is an authorized dealer of Anarchy Interdimensional "+
      "weapons and pain inflicting devices.  Since this is a "+
      "lawless multiverse, let chaos and anarchy reign!  "+
      "Purchase your dangerous device before someone else does!");
    set( "day_light", WELL_LIT );
    add( "exits", ([
			"east" : "room016" ]) );

    set( InsideP, 1 );

    shop = clone_object( ShopCode );
    shop->set("owner_name","Kalar");
    shop->set("active_owner",1);
    shop->set("sign_header","ANARCHY INTERDIMENSIONAL" );
    shop->set( "short", "a sign posted to the wall" );
    shop->add( "valid_properties", ({ WeaponP }) );
    shop->add_item( WEAPONDIR + "edged/morning_star", 3, 50);
    shop->add_item( WEAPONDIR + "edged/fauchard", 2, 30);
    shop->add_item( WEAPONDIR + "edged/sickle", 4, 40);
    shop->add_item( WEAPONDIR + "thrusting/stone_spear1", 5, 30);
    shop->add_item( WEAPONDIR + "thrusting/stiletto", 10, 50);
    shop->add_item( WEAPONDIR + "edged/khopesh", 2, 25);
    shop->add_item( WEAPONDIR + "thrusting/rapier", 2, 10);
    shop->add_item( WEAPONDIR + "blunt/quarterstaff", 2, 50);
    shop->add_item( WEAPONDIR + "blunt/lead_pipe", 1, 60);
    shop->add_item( WEAPONDIR + "blunt/skinny_club", 5, 50);
    move_object(shop, THISO);

    set( "reset_data", ([
      "keeper" : SHOPKEEPER,
    ]) );
}
