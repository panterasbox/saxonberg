/*
Object created w/ Torenthal's Object Generator
Please leave the above line in the object for future use
*/

#define CAPNAME capitalize(THISP->query_name())

inherit "/obj/armor/armor/special/base_amulet";
inherit IdentifyCode;

object destination;

void extra_create()
{
    if (root()) return;

    set_name("red amulet");
    add_alias("amulet");
    set_short("a red amulet");
    set_long(
      "This is a bright red amulet.  Maybe if you 'gaze' at it you might " +
      "see something!\n");
    set_id_long(
      "This is a bright red amulet of transportation.\n" +
      "Usage:  gaze amulet\n" +
      "          - views location of amulet set point\n" +
      "        set amulet\n" +
      "          - sets the amulet to return to a room\n" +
      "        rub amulet\n" +
      "          - transports yourself and your equipment to the set room.\n");
    set_weight(1);
    set_value(250);
    set("gettable", 1);
    set("droppable", 1);
    set_id_short("an amulet of transportation");
    set( MagicP, 1 );
}

void extra_init()
{

    add_action("gaze", "gaze");
    add_action("set_amulet", "set");
    add_action("rub_amulet", "rub");
    seteuid(getuid(THISP));
}

status gaze(string str)
{
    object temp;

    if (str == "amulet") {
	if (destination) {
	    write("The amulet clears, and you can see: \n\n");
     write( destination->long() );
	}
	else
	    write("The amulet stays opaque.\n");
    }
    return (1);
}

status set_amulet(string str)
{
    if (id(str)) {
	destination = environment(THISP);
	write("The amulet flashes red briefly.\n");
	say(CAPNAME + " glances at a red amulet and it lights up briefly.\n");
    }
    else
	return (0);
    return (1);
}

status rub_amulet(string str)
{
    if (!destination) {
	write("The amulet hums for a moment and then quiets.\n");
	return (1);
    }
    if (test_property(ENV(THISP),NoTeleportOutP) || test_property(destination,NoTeleportInP)) {
	write("The amulet turns warm briefly.\n");
	return (1);
    }
    say(CAPNAME + " rubs a red amulet.\n");
    tell_object(THISP,"You feel yourself moving ...\n");
    THISP->move_player("in a puff of red smoke",destination);
    if (random(100) < 25) {
	write("The amulet doesn't make the journey intact.\n");
	destruct(THISO);
    }
    return (1);
}

