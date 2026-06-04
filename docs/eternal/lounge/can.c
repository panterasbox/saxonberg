/*
**  originally coded by Therin, with fixes made by Phretys on 5/93
**
**  Moved empty can to heal_comm to stop people from getting free cans!  
**  Hodge - 05/03/2005
*/

// Changed healing amounts to reflect portable healing standards.

#include "/zone/null/eternal/eternal.h"
inherit HealCode;

void setup_next_use();

void extra_create() {
    set("id", ({
	"can",
	"pop",
	"soda",
	"soft drink",
	"drink",
	"beverage",
	"carbonated delight",
	"high-fructose liquid",
      }) );
    set("short","a soft drink can");
    set("plural","soft drink cans");
    set("id_short","a soft drink can");
    set("long","This is a soft drink can.");
    set("weight", 75);
    set("value", 1);
    setup_next_use();
    set("heal_uses", 1);
    set("heal_action", "drink");
    set( MagicP, 1 );
}

void setup_next_use() {
    set("heal_hp", 5);
    set("heal_mana", 5);
    set("heal_ftg", 7);
}

status do_heal( string arg ) {

    if ( !id( arg ) )
	return 0;
    set( "action_msg", ({ 
	"Ahh!! Refreshing!",
	" drinks something and looks refreshed!"
      }) );
    return ::do_heal(arg);
}

void heal_comm( object player )
{
    object can;
    can = clone_object( "/zone/null/eternal/lounge/empty_can" );
    move_object( can, player );
}
