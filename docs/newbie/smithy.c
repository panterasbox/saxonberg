//  smithy.c
//  written by Hannah on 10/94

#include "Newbie.h"

object ga;

void extra_create()
{
    set( "short", "Nocilis' Fine Weaponry" );
    set( "day_long",
      "When you walk in the door, you immediately see a counter across the room, behind which "
      "there is a stool.  Tables line the rest of the walls, displaying a marvelous array of weaponry "
      "for purchase.  Spread along the front counter are Nocilis' recent whittlings.  The room "
      "smells of fresh paint, as construction has only recently finished here."
    );
    set( "day_light", WELL_LIT );
    set( "night_light", WELL_LIT );

    set( "exits", ([ "east":  "good12" ]) );

    set( "descs", ([
      "whittlings":
          "These whittlings are of peaceful creatures; the most noticeable one is a well-carved bunny " 
          "rabbit."
    ]) );
    set( "reset_data", ([ "shopkeeper": NEWBIE + "Mon/nocilis" ]) );
    ga = clone_object( ShopCode );
    move_object( ga, THISO );
    ga->set("owner_name", "Nocilis");
    ga->set("active_owner",  1 );
    ga->set_sign_header( "NOCILIS'  FINE  WEAPONRY" );
    ga->set( "short", "a small sign nailed to the counter" );
    ga->set("id", ({"sign","small sign"}) );
    ga->add_item( WEAPONDIR + "edged/long_sword", 7, 60 );
    ga->add_item( WEAPONDIR + "edged/morning_star", 4, 45 );
    ga->add_item( WEAPONDIR + "edged/halberd", 3, 40 );
    ga->add_item( WEAPONDIR + "edged/scimitar", 2, 50 );
    ga->add_item( WEAPONDIR + "edged/small_knife", 5, 80 );
    ga->add_item( WEAPONDIR + "edged/hand_axe", 4, 60 );
    ga->add_item( WEAPONDIR + "thrusting/dagger", 8, 65 );
    ga->add_item( WEAPONDIR + "thrusting/rapier", 2, 55 );
    ga->add_item( WEAPONDIR + "thrusting/dirk", 3, 80 );
    ga->add_item( WEAPONDIR + "blunt/skinny_club", 3, 50 );
    ga->add_item( WEAPONDIR + "blunt/lead_pipe", 4, 60 );
    ga->add_item( WEAPONDIR + "blunt/chain", 8, 70 );

    /* ----- This shop should only buy weapons from players. -----*/
    ga->add( "valid_properties", ({ WeaponP }) );

    set( InsideP, 1 );
}

