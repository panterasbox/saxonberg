inherit MonsterCode;
#include "comm.h"
#include <ansi.h>

void extra_create()
{
    set_name("balloon pilot");
    add_alias("pilot");
    set_short("EotL School Balloon Pilot");
    set_long(
      "This is the Pilot of the EotL School Balloon.  He is "
      "wearing a deep blue uniform, complete with red pinstripes "
      "and a hat.  His usual posture is seated on a stool, with his "
      "large hand on the lever that controls the balloon.  "
      "His face is drawn and haggard.  His yellowish tinged skin is "
      "is stretched over his hollow cheeks, stained from years of "
      "smoking unfiltered Lucky Strikes.  The County won't allow him "
      "smoke in the balloon, however.  So most of the time, he is "
      "in a dour mood, jonesing for a butt."
    );
    set_stat("str",100);
    set_stat("con",80);
    set_stat("dex",30);
    set_stat("int",20);
    set_stat("wil",20);
    set_stat("chr",20);
    set_race("human");
    set_gender("male");
    if(clonep())
	call_out("pilot_greet",random(10));
    move_object(clone_object("/zone/null/eternal/school/parachute"),THISO);
    command("wear chute");
}

void extra_reset()
{
    if(!present("chute",THISO)){
	move_object(clone_object("/zone/null/eternal/school/parachute"),THISO);
	command("wear chute");
    }
}

status begin_ascent(object dest)
{
    int i;
    if(present_path("/zone/null/eternal/school/lever",ENV(THISO)))
    {
	command("press button");
	for(i=0;i<20001;i++){
	    switch(i){
	    case 500 :
		call_out("lever_pull",10,i,1,2);
		break;
	    case 2000 :
		call_out("lever_pull",20,i,1,3);
		break;
	    case 5000 :
		call_out("lever_pull",35,i,1,4);
		break;
	    default :
		break;
	    }
	}
    }
    return 1;
}

status begin_descent(object dest)
{
    int i;
    if(present_path("/zone/null/eternal/school/lever",ENV(THISO))){
	for(i=5001;i>0;i--){
	    switch(i){
	    case 10 :
		call_out("lever_pull",20,i,0,1);
		break;
	    case 500 :
		call_out("lever_pull",10,i,0,2);
		break;
	    case 2000 :
		call_out("lever_pull",5,i,0,3);
		break;
	    default :
		break;
	    }
	}
    }
    return 1;
}

status lever_pull(int i, int c, int s)
{
    object lever;
    lever=present_path("/zone/null/eternal/school/lever",ENV(THISO));
    if(!lever)return 0;
    lever->set("alt",i);
    lever->set("set",s);
    tell_room(ENV(THISO),"The Pilot "+(c?"pulls":"pushes")+
      " on the lever, "+(c?"increasing":"decreasing")+" the flame.\n");
    if(i==5000)
	Say(THISO,"We've reached cruising altitude.  Please keep arms and feet inside the gondola.  Please no spitting over the side.  Please keep quiet, I have a headache.");
    "over the side.  Please keep quiet, I have a headache.";
    if(i==5000&&c==1)
	call_out("begin_descent",15,0);
    return 1;
}

status no_wei_you_turd(object turd)
{
    string mess, nom;
    nom = turd->query_name();
    mess = "Hey there, stupid.  I drive the balloon.  Me, not you.  I drive, "
    "you sit.  You think I like this?  You think I like ferrying you dorks "
    "back and forth, back and forth all day and all night with no "
    "breaks?  You think I wouldn't in an instant give you this job "
    "so that I could sit there and try to pull on your lever?  "
    "Don't you think I'd do that?  I would.  But for now "
    "we live in a capitalistic society and I need money to pay my rent.  "
    "I don't come to where you work and knock the whang outta yer mouth "
    "so DON'T TOUCH MY LEVER!";
    tell_room(ENV(THISO),nom+" reaches for the lever and the Pilot slaps "+possessive(turd)+" "+turd->query_hand_name()+" away!\n",({turd}));
    tell_object(turd,"You reach for the lever and the Pilot slaps your "+turd->query_hand_name()+" away!\n");
    Say(THISO,mess);
    return 1;
}

status pilot_greet()
{

    tell_room(ENV(THISO),"The Pilot climbs into the balloon, throwing a lit cigarette out to the ground.\n");
    Say(THISO,"I don't get paid enough for this lameass job.");
    return 1;
}
