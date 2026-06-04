#include "/zone/null/eternal/eternal.h"

#define FRANKENSTEIN    "/zone/null/eternal/monsters/dr_frank"
#define GOLDCROSS       "/zone/null/eternal/goldcross"
#define UnkillServer    "/adm/bin/unkill"

inherit RoomPlusCode;

extra_create()
{
    object o;

    set("map_symbol", "BS");
    set("short", "Dr. Frankenstein's Body Shop");
    set("day_long",
        "Welcome to Dr. Frankenstein's Body Shop, where the best bodies "
        "around are serviced, repaired, and regenerated.  The shop "
        "consists of a large, nearly unlit chamber.  Several steel tables "
        "lined up in the middle of the room are the only furnishings here.  "
        "Various surgical instruments and liquids have been placed on several "
        "of the tables in an orderly manner.  Hanging on the eastern wall is "
        "the good Doctor's chart showing who he has helped last. The black "
        "gravel of Tanelorn Road can be seen to the west.");
    set("day_light",   20);
    set("night_light", 10);
    set("exits", ([
        "west": "room006"]));
    set("first",  5);
    set("second", 4);
    set("third",  3);
    set("fourth", 2);
    set("fifth",  1);
    set("name1", "Jesus was brought back on Thu Jul 09 20:17:19");
    set("name2", "Dorcas was brought back on Sun Aug 29 11:37:19");
    set("name3", "Eutychus was brought back on Thu Jul 19 20:47:19");
    set("name4", "Lazarus was brought back on Mon Feb 12 08:57:19"); 
    set("name5", "Jairus was brought back on Fri Mar 22 10:27:19");
	set( NoCombatP, 1);
    set(InsideP, 1);
    set("descs", ([
        ({"steel tables","tables", "slab"}):
            "All of the tables here have been fashioned from a shiny steel and "
            "are of the same design.  They appear to be slightly larger than "
            "the size of an orc man.  Perhaps they are used in conjunction "
            "with the tools and vials of liquids of unknown nature placed "
            "about the room.",
        ({"doctor's chart","doctors chart","chart","good doctors chart"}) :
            "The chart shows the good Doctor's top 5 greatest "
            "regenerations.  Maybe you could 'read chart'.",
        "tools":
            "Several shiny, steel tools, probably medical in nature, have "
            "been placed on several of the tables about the center of the "
            "room.",
        "instruments":
            "Several shiny, steel tools, probably medical in nature, have "
            "been placed on several of the tables about the center of the "
            "room.",
        "liquids":
            "Several vials of colored liquids, probably medical in nature, "
            "have been placed on the tables about the center of the room.",
        "vials":
            "Several vials of colored liquids, probably medical in nature, "
            "have been placed on the tables about the center of the room."]));

    set( "reset_data", ([ "doctor" : FRANKENSTEIN ]) );
    call_other( UnkillServer, "???" );
    move_object( FINDO( UnkillServer ), THISO );

}
void extra_init()
{
  if(THISP->query_aggressive()) destruct(THISP);
  add_action("regenerate", "regenerate");
  add_action("do_read", "read");
}
int do_read(string str)
{
    if(str == "chart")
    {
        tell_object(THISP, sprintf(
            "Past Five Regenerations:\n\t%s\n\t%s\n\t"
            "%s\n\t%s\n\t%s\n",
            THISO->query("name1"), THISO->query("name2"), THISO->query("name3"),
            THISO->query("name4"), THISO->query("name5")));
        return 1;
    }
    return 0;
}
int regenerate(string arg)
{
    int level;
    object doctor;

//	if( !arg )
//        return(0);
    if(!THISP->query_ghost()) 
    {
        tell_object(THISP,
            "You are already alive!\n");
        return 1;
    }
    doctor = present_clone( FRANKENSTEIN);
    level = to_int(THISP->query_eval());

    THISP->make_me_alive();
    THISP->regenerate();

    tell_room(THISO, strformat("Power surges through the room as "
         "another ghost returns to the mortal world!\n"));
    if(doctor)
    {
        command("say Ah, another satisfied customer!", doctor);

        if(level > 50)
        {
            THISO->set("name5", THISO->query("name4"));
            THISO->set("name4", THISO->query("name3"));
            THISO->set("name3", THISO->query("name2"));
            THISO->set("name2", THISO->query("name1"));
            THISO->set("name1", 
                capitalize(THISP->query_real_name()+" was brought back on "+
                ctime()[0 .. 18]));

            command("say That is one for the records.",doctor);
            tell_room(THISO, sprintf(
                "%s updates the chart on the wall.\n",
                doctor->query_name()));
        }
    }
    return 1;
}
