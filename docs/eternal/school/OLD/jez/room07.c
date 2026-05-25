inherit RoomPlusCode;
#include "/inc/global/ansi.h"



void extra_create()
{
    set("short","A Small School Gym");
    set("day_long",
      "This is a small gym in the EotL School.  It serves as a place to learn to use " +
      "combat.  There is a monster that can be killed in order to fine tune your skills.  " +
      "There is a small sign on the wall of the gym.  Look at it to continue."
    );
    set("day_light",10);
    set("night_light",1);
    add("exits", (["south": "room06"]));
    add("exits", (["north": "room08"]));
    add("descs",(["sign": "Before fighting, remember to be fully armed.  " +
	"Use 'equip' to wield and arm.  Use the command 'kill monster' to kill the " +
	"newbie tester.  If you run low on hp's, type 'stupor' to add hp's and take fatigue.  " +
	"Usually, you will have the opportunity to buy healing, so if " +
	"you drop down too much you can heal during combat.  Just remember, " +
	"watch out for player killers (pker's) once you start playing.  If  " +
	"you are above eval 1, they can kill you.  " +
	"If you should happen to die, you can go to Frank's Place to regenerate.  " +
	"When you die, you lose ten percent of your stats and skills.  The directions from the lounge are:  " +
	"d 4w 3n e' then 'regenerate'.  " +
	"As soon as you kill the monster, type 'rest' to raise your hp back up to normal.  " +
	"To check your hit points, type 'hp', and when they get up to full, type 'stand', " +
	"and go north to the next lesson."]) );
}

void extra_reset(){
    object monster;
    if(!present("monster")){
	monster = clone_object("/zone/null/eternal/school/newbie_monster.c");
	move_object(monster, THISO);
    }
}

void extra_init()
{
    if(!present("monster")&&!THISP->query("been there"))
    {
	if(THISP->query_ansi())
	    write(HIR+"Type 'monster' to call a new newbie monster.\n"+NORM);
	else write("Type 'monster' to call a new newbie monster.\n");
	add_action("do_monst","monster");
    }
}

status do_monst()
{
    if(THISP->query("been there"))return 0;
    move_object(clone_object("/zone/null/eternal/school/newbie_monster"),THISO);
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
    if(!present(who)||!present("corpse"))return 1;
    mess="Hey, "+who->query_name()+"...  Don't forget to Dest me!  "
    "My body lying here takes up valuable memory!  Just type 'Dest corpse' and "
    "I'm gone!  See ya later!";
    tell_room(THISO,strformat(mess,"The corpse of Dead Meat says: "));
    return 1;
}
