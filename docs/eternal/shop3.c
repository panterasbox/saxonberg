/* shop3.c */

#include "/zone/null/eternal/eternal.h"

inherit RoomCode;

#define SHOPKEEPER "/zone/null/eternal/monsters/kilbor_shopkeeper.c"
#define RACISM     "/zone/null/eternal/objects/kilbor_racism"

extra_create()
{
    object shop;
    set( "map_symbol", "AI" );
    set( "map_hint_x", -1 );

    set( "short", "Anarchy Interdimensional");
    set( "day_long",
      "This is an authorized dealer of Anarchy Interdimensional "+
      "weapons and pain inflicting devices.  Since this is a "+
      "lawless multiverse, let chaos and anarchy reign!  "+
      "Purchase your dangerous device before someone else does!"
      "\nA notice reads:  UNDER TEMPORARY MANAGEMENT");
    set( "day_light", WELL_LIT );
    add( "exits", ([
        "east" : "room016" ]) );

    set( InsideP, 1 );

    shop = clone_object( ShopCode );
    shop->set("owner_name","Kilbor");
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

    set( InsideP, 1 );
}

void enter_signal(object item, object oldenv, object mover,int pass) {
    if(item && item->query_race()=="Gnome") {
        call_out( "kilbor_greeting", 2 );
        if(present_clone(RACISM,item)) { return 0; }
        move_object(clone_object(RACISM),item);
    }
    return 0;
}

void leave_signal(object item,object dest, object mover) {
    if(item->query_race()=="Gnome") {
      call_out( "kilbor_goodbye", 2 );
    }
    return 0;
}

kilbor_greeting() {
    if(present("kilbor")) {
        command( "say what're you doin' here, you short freak!",
          present("kilbor") );
        command( "grumble", present("kilbor") );
    }
    return 1;
}

kilbor_goodbye() {
    if(present("kilbor")) {
        command( "say god i hate those fuckin' gnomes.",
          present("kilbor") );
    }
    return 1;
}
