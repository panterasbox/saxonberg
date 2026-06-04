inherit MonsterCode;
#include "comm.h"
#define PA "/zone/null/eternal/school/pa"

void extra_create()
{
    set_name("Principal Ferguson");
    add_alias("principal");
    add_alias("ferguson");
    set_gender("male");
    set_race("human");
    set_alignment("neutral");
    set_stat("str",100);
    set_stat("int",20);
    set_stat("con",150);
    set_stat("dex",20);
    set_stat("chr",20);
    set_short("Principal Ferguson of EotL School");
    set_long(
      "Principal Ferguson is a rotund man.  His girth has grown "
      "manyfold in his tenure as Principal of EotL School.  In his "
      "14 years of service, he has spent upwards of three thousand "
      "dollars on kit-kat bars, his not-so-secret vice.  It looks as "
      "if he hasn't purchased a new suit in those 14 years.  The shiny, "
      "brown polyester is stretched to the limit around his expansive "
      "waist, eking ever closer to, and yet never reaching, the bursting "
      "point.  Dark patches of sweat radiate from his armpits.  A cigarette dangles from "
      "the corner of his handlebar mustachioed mouth.  His beady "
      "deep-set eyes regard you distrustfully."
    );
    if(clonep())
	call_out("randPa",random(500));
}

void extra_reset()
{
    object ob;
    if(!present_path("/zone/null/eternal/school/pa")){
	ob=clone_object("/zone/null/eternal/school/pa");
	move_object(ob,THISO);
	command("press button");
    }
}

status randPa( )
{
    string *ann, mort, mess;
    mort = users()[random(sizeof(users()))]->query_name();
    ann = 
    ({ "Fishsticks and tater tots for lunch today.",
      "none",
      mort+"...  Please report to the principal's office immediately.",
      "Welcome to school.  Type \"say <something>\" to speak to your teacher.",
      "Next week is the field trip.  Remember to get your permission slips signed.",
      "none",
      "School's in session.  Talk to your teacher by using \"say <something>\".",
      "Mr. Ressler is looking for his slide rule.  If you've seen it, please let him know.",
      "Vice Principal Delong is still recovering from his breakdown.  Please wish him well.", 
      "Welcome to EotL School.  Your teacher will talk to you if you ask for a lesson with the \"say <something>\" command.",
      "If anyone found "+mort+"'s shoe, please come to the office.  It was lost on the playground.",
      "none",
    });
    mess=ann[random(sizeof(ann))]; 
    PA->pa_announce(mess);
    if(mess!="none")
Say(THISO,mess);
    if(present_path("/zone/null/eternal/school/pa"))
	call_out("randPa",random(500));
    return 1;
}         

status query_enter_ok(object item, object who) 
{
    if(program_name(item)=="/zone/null/eternal/school/pa"&&
      caller()!=THISO)
	call_out("randPa",random(10));
    return 0;
}
