/* wretched soul (undead) */

inherit MonsterCode;
inherit MonsterMove;


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
    set_natural_ac(3);
    set_max_damage(8);
    set_type("blunt");
    set_offensive_level(5);
    set_defensive_level(5);
    set_skill("dodge", 5);
    set_msgin("drifts in");
    set_msgout("drifts");
    add_property(THISO, "undead");
    set_move_rate(40);
    set_move_chance(40);
}
