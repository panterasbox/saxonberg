/*
**   Revised:  March 13, 1994 by Esquire
**      I added the magic property, and changed it to use the
**      take_damage instead of do_damage().
*/


#define FIREOBJ "/zone/null/eternal/magic/fire_object"
inherit ObjectCode;

void extra_create()
{
    set("id","fire potion");
    add("id","potion");
    set("short","a red potion");
    set("long","This is a small vial of frothy red liquid.  It is rather "+
      "warm and smells terrible.  You might want to try <throw>ing it "+
      "<at> <someone>.\n");
    set("weight", 10);
    set("value", 300);
    set( MagicP, 1 );
    set( PotionP, 1 );
}

void extra_init()
{
    add_action("throw","throw");
}

status throw(string str)
{
    string what, who;
    object ob, target;

    if(!str)
    {
	notify_fail("Throw what at who?\n");
	return 0;
    }
    if(sscanf(str, "%s at %s", what, who))
    {
	if(!id(what))
	{
	    notify_fail("Throw what at who?\n");
	    return 0;
	}
	if(!target = present(who, ENV(THISP)))
	{
	    notify_fail(capitalize(who) + " is not here!\n");
	    return 0;
	}
	if(!living(target)) {
	    notify_fail("That is not a living thing.\n");
	    return 0;
	}
	if(!target->attackable()) {
	    notify_fail("You cannot attack that.\n");
	    return 0;
	}
	if(target == THISP)
	{
	    notify_fail("Only a fool would throw a fire potion at " +
	      "themself.\n");
	    return 0;
	}
	write("You throw the fire potion at " + target->query_name() +
	  "!\n" + target->query_name() + " is engulfed in a ball of " +
	  "fire!\n");
	tell_object(target, PNAME + " throws a fire potion at you!!\n" +
	  "You are engulfed in a ball of fire and severely burned!\n");
	tell_room(ENV(THISP), PNAME + " throws a fire potion at " +
	  target->query_name() + ", engulfing " + target->query_name() +
	  " in a ball of fire!\n", ({THISP, target}));
	target->take_damage(random(20) + 10, 0, "fire", THISP);
	if(target) {
	    if(random(target->query_stat("wil")) < 20)
		command("scream",target);
	    if(random(target->query_stat("wil")) < 15)
		target->run_away();
	    THISP->attack_object(target);
	    if(!present("FireObject",target))
		move_object(clone_object(FIREOBJ),target);
	}
	destruct(THISO);
	return 1;
    }
    notify_fail("Throw what at who?\n");
    return 0;
}
