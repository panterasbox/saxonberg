//  Genious: newbie/armory.c
//  written by Hannah on 5/94

#include "Newbie.h"

object ga;


void extra_create()
{
    set( "short", "Grandallion Armory" );
    set( "day_long",
        "This is a small building in the village that offers light-quality "+
        "armor.  The aroma of polishes, leather, and potpourri combine in "+
        "the air resulting in a strange yet interesting combination.  "+
        "Tanjerra is usually here tending the shop." );
    set( "day_light", WELL_LIT );

    set( "exits", ([ "west":  "good12" ]) );


    set( "reset_data", ([ "shopkeeper": NEWBIE + "Mon/tanjerra" ]) );

    ga = clone_object( ShopCode );
    move_object( ga, THISO );
ga->set("owner_name", "Tanjerra");
    ga->set("active_owner",  1 );          // shop closes if !Tanjerra
    ga->set_sign_header( "GRANDALLION  ARMORY" );
    ga->set( "short", "a small sign hanging from one of the walls" );
    ga->set("id", ({"sign","small sign"}) );

    ga->add_item( ARMORDIR + "boots/soft_leather_shoes", 6, 75 );
    ga->add_item( ARMORDIR +
                              "breastplates/soft_leather_long_shirt", 4, 50 );
    ga->add_item( ARMORDIR +
                              "breastplates/soft_leather_short_shirt", 4, 50 );
    ga->add_item( ARMORDIR + "gauntlets/soft_leather_gloves", 4, 75 );
    ga->add_item( ARMORDIR + "helmets/leather_cap", 5, 75 );
    ga->add_item( ARMORDIR + "leggings/soft_leather_leggings", 4, 75 );
    ga->add_item( ARMORDIR + "leggings/leather_leggings", 4, 75 );
    ga->add_item( ARMORDIR + "shields/buckler", 5, 75 );
    ga->add_item( ARMORDIR + "shields/small_wooden", 4, 75 );
    ga->add_item( ARMORDIR + "sleeves/soft_leather_sleeves", 4, 75 );

    /* ----- This shop should only buy armor from players. -----*/
    ga->add( "valid_properties", ({ ArmorP }) );

    set( InsideP, 1 );
}
