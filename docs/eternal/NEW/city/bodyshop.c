/* Dr. Frankenstein's Body Shop */

#include "/zone/null/eternal/eternal.h"

#define FRANKENSTEIN    MONSTERS + "dr_frank"

inherit RoomPlusCode;

int regenerate(string arg)
{
    if (arg)
        return(0);
    if (!THISP->query_ghost()) {
        write("But you aren't a ghost!\n");
        return(1);
    }
    THISP->make_me_alive();
THISP->regenerate();
    tell_room(THISO, "Dr. Frankenstein says: Another satisfied customer!\n");
    return(1);
}

/*
void extra_reset()
{
    if (!present("frankenstein")) {
        move_object(clone_object(FRANKENSTEIN), THISO);
        tell_room(THISO, "Dr. Frankenstein arrives.\n");
    }
}
*/

void extra_init()
{
	if(THISP->query_aggressive()) destruct(THISP);
    add_action("regenerate", "regenerate");
}

void extra_create()
{
    set("short","Dr. Frankenstein's Body Shop");
    set("day_long", 
        "Welcome to Dr. Frankenstein's Body Shop, where the best bodies around are " +
        "serviced, repaired, and regenerated.  The shop consists of a large, nearly " +
        "unlit chamber.  Several steel tables lined up in the middle of the room " +
        "are the only furnishings here.  Various surgical instruments and liquids " +
        "have been placed on several of the tables in an orderly manner.  The " +
        "black gravel of Tanelorn Road can be seen to the west."
    );
    set("day_light", 20);
    set( "night_light", 10);
   set("exits", (["west": "room006"]));
    set("descs",
        ([ "tables":
           "All of the tables here have been fashioned from a shiny steel and are\n" +
           "of the same design.  They appear to be slightly larger than the size of\n" +
           "an orc man.  Perhaps they are used in conjunction with the tools and\n" +
           "vials of liquids of unknown nature placed about the room.",
           "tools":
           "Several shiny, steel tools, probably medical in nature, have been placed\n" +
           "on several of the tables about the center of the room.",
           "instruments":
           "Several shiny, steel tools, probably medical in nature, have been placed\n" +
           "on several of the tables about the center of the room.",
           "liquids":
           "Several vials of colored liquids, probably medical in nature, have been\n" +
           "placed on the tables about the center of the room.",
           "vials":
           "Several vials of colored liquids, probably medical in nature, have been\n" +
           "placed on the tables about the center of the room.",
            ])
        );
   set( "reset_data", ([ "doctor": FRANKENSTEIN]));
   set(NoCombatP,1);
}

