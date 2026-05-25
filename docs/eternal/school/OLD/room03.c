#include <ansi.h>
inherit RoomPlusCode;

void extra_create()
{
    set("short","The EotL School Gymnasium");
    set("day_long",
      "This room is covered entirely with exercise mats.  It is "
      "otherwise devoid of any exercise equipment.  With closer "
      "inspection, you notice that what you at first saw as purple "
      "details on the blue mats are actually stains of some sort."
      "  There is a passageway in the south wall."
    );
    set("day_light",BRIGHT);
    set("reset_data",([
	"monster":"/zone/null/eternal/school/newbie_monster",
      ]) );
    set("exits",([
	"south":"/zone/null/eternal/school/room02",
      ]) );
    set("descs",([
	({"mat","mats","exercise mat","exercise mats"}):
	"These mats are well-padded and worn in.  They seem to have "
	"seen a lot of use.  The stains are more mauve than purple now "
	"that you look at them more closely.",
	({"stain","stains"}):
	"These stains are almost mauve in color and seem to be a permanent "
	"part of the mats.  Oddly enough, you are convinced that they are "
	"bloodstains.",
      ]) );
}

void extra_init()
{
    if(!present_path("/zone/null/eternal/school/newbie_monster")&&!THISP->query("gradiated"))
    {
	if(THISP->query_ansi())
	    write(HIR+"Type 'monster' to call a new newbie monster.\n"+NORM);
	else write("Type 'monster' to call a new newbie monster.\n");
	add_action("do_monst","monster");
    }
}

status do_monst()
{
    if(THISP->query("gradiated"))return 0;
    if(present_path("/zone/null/eternal/school/newbie_monster"))return 0;
    move_object(clone_object("/zone/null/eternal/school/newbie_monster"),THISO);
    write("A pathetically small and weak-looking troll strolls in from the locker room.\n");
    return 1;
}

status dest_warn(object killer)
{
    call_out("do_warn",random(10)+5,killer);
    return 1;
}

status do_warn(object who)
{
    string mess;
    if(!who||!present(who)||!present("corpse"))return 1;
    mess="Hey, "+who->query_name()+"...  Don't forget to Dest me!  "
    "My body lying here takes up valuable memory!  If you have a guide, just type 'Dest corpse' and "
    "I'm gone!  See ya later!";
    tell_room(THISO,strformat(mess,"The corpse of Dead Meat says: "));
    return 1;
}
