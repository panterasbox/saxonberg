/* wretched soul (undead) */

#include "/zone/null/eternal/eternal.h"
inherit MonsterCode;
inherit MonsterMove;

#include "path.h"

void extra_create()
{
    object tmp;

    set_name("wretched soul");
    add_alias("soul");
    set_short("a wretched-looking soul drifting about....");
    set_long("Looking upon the empty eyes of this soul, you feel a " +
	"shiver run down your spine, as the soul communicates to you " +
	"that it was once a troll warrior, but the forces of chaos " +
	"had captured him in a battle and placed him in Eternal City " +
	"to suffer for eternity.  You feel pity for this soul.");
    set_race("troll");
    set_alignment(10);
    set_type("blunt");
    add_property(THISO, "undead");
    set_toughness( 3 );
    set_move_rate(40);
    set_move_chance(40);
}
