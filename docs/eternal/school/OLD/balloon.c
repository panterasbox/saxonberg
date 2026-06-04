inherit ObjectCode;

#define SERVER "/zone/null/eternal/school/BalServer"
#define GONDOLA "/zone/null/eternal/school/gondola"
object pilot, lever;
int flag;

void extra_create()
{
    set("id",({"balloon","hot air balloon","eotl balloon",}));
    set("short","the EotL Newbie School Hot Air Balloon");
    set("long",
      "This huge hot air balloon towers above you.  You crane your neck "
      "to see the words \"Eternal County Public School System Balloon"
      " No. 720\" in huge black letters at least ten feet tall painted onto "
      "the yellow nylon material that the balloon is made of.  Attached to "
      "the bottom of the balloon by ropes is a large, wicker gondola.  It "
      "looks like you could climb in."
    );
    set("gettable",0);
    if(clonep())
	GONDOLA->set_balloon(THISO);
}

status move_balloon(string dest, string who)
{
    string mess, room, dir, lev;
    object droom, gondola;
    gondola=FINDO(GONDOLA);
    droom=FINDO(dest);
    pilot=present_path("/zone/null/eternal/school/pilot",
      gondola);
    lever=present_path("/zone/null/eternal/school/lever",gondola);
    if(who=="the pilot")
	lever->setDest(dest);
    if(!flag&&pilot)pilot->begin_ascent(dest);
    if(pilot)
	flag?flag=0:flag=1;
    room=lower_case(droom->query("short"));
    if(ENV(THISO))
	tell_room(ENV(THISO),
	  "The EotL School Balloon throws off ballast and lifts into the sky.\n");
    enable_commands();
    move_object(THISO, FINDO(dest));
    switch(dest)
    {
    case "/zone/null/eternal/school/parking_lot" :
	mess="lands in the EotL school parking lot";
	lev="pushes";
	dir="decreasing";
	lever->set("alt",0);
	lever->set("set",0);
	break;
    case "/zone/null/eternal/lounge/lounge" :
	mess="lands in the EotL Players' Lounge";
	lev="pushes";
	dir="decreasing";
	lever->set("alt",0);
	lever->set("set",0);
	break;
    case "/zone/null/eternal/school/mid_air" :
	mess="soars upwards into the sky";
	lev="pulls";
	dir="increasing";
	lever->set("alt",10);
	lever->set("set",1);
	break;
    default :
	mess="flies off to: "+room;
	dir="increasing";
	break;
    }
    tell_room(GONDOLA, strformat(
	(who?who:"The Pilot")+" "+lev+" on the lever, "+dir+" the flame, and the "
	"balloon "+mess+"."
      ), ({FINDP(lower_case(who))}));
    if(FINDP(lower_case(who)))
	tell_object(FINDP(lower_case(who)),"You "+(lev=="pulls"?"pull":"push")+" on the "
	  "lever, "+dir+" the flame, and the balloon "+mess+".\n");
    if(ENV(THISO))
	tell_room(ENV(THISO),
	  "The EotL School Balloon settles gently to the ground.\n");
    GONDOLA->set("bleah",dest);
    return 1;
}

do_climb(string str)
{
    if(str!="in"&&str!="out")return 0;
    if(!IsWizard(THISP)&&THISP->query_real_name()!="alise")
    {
	tell_object(THISP,"The EotL Newbie School balloon is not ready for you yet!  But it's coming soon!\n");
	return 1;
    }
    load_object(GONDOLA);
    GONDOLA->set("bleah",file_name(ENV(THISO)));
    if(str=="in"){
	if(ENV(THISP)==GONDOLA){
	    write("You are already inside the gondola.\n");
	    return 1;
	}
	write("You climb in the gondola of the hot air balloon.\n");
	tell_room(ENV(THISP),PNAME+" climbs into the gondola of the hot air balloon.\n",({THISP}));
	move_object(THISP,GONDOLA);
	tell_room(GONDOLA,PNAME+" climbs into the gondola.\n",({THISP}));
	GONDOLA->set("ball",THISO);
	THISP->glance();
	return 1;
    }
    else{
	if(ENV(THISP)!=GONDOLA){
	    write("You are not in the gondola.\n");
	    return 1;
	}
	write("You climb out of the gondola.\n");
	tell_room(GONDOLA,PNAME+" climbs out of the gondola.\n",({THISP}));
	move_object(THISP,ENV(THISO));
	tell_room(ENV(THISO),PNAME+" climbs out of the gondola of the hot air balloon.\n",({THISP}));
	THISP->glance();
	return 1;
    }
}

void extra_init()
{
    add_action("do_climb","climb");
}

void begin_too_high()
{
    call_out("too_high",random(20)+5,1);
}

status too_high(int n)
{
    object *ppl, gond;
    int i;
    gond=FINDO(GONDOLA);
    if(lever->query("set")<5)return 1;
    switch(n)
    {
    case 1 :
	tell_room(gond,"You smell something strange wafting through the air, almost like something smoldering.\n");
	call_out("too_high",random(20)+5, 2);
	break;
    case 2 :
	tell_room(gond,"The balloon bursts into flames from the high heat of the burner!\n");
	tell_room(gond,"The ropes holding the gondola to the balloon burn and snap!\n");
	tell_room(gond,"The gondola tips and suddenly you find yourself falling...\n\n\n");
	ppl=all_inventory(gond);
	i=sizeof(ppl);
	set("short","the EotL Newbie School Balloon (in flames)");
	call_out("big_bume",random(30));
	while(i--){
	    if(ppl[i]->is_player()){
		move_object(ppl[i],"/zone/null/eternal/school/mid_air");
		ppl[i]->glance();
	    }
	}
	break;
    default :
	break;
    }
    return 1;
}

status big_bume()
{
    object *ppl;
    int i;
    tell_room(ENV(THISO),"The balloon explodes in a violent fireball!\n");
    tell_room(FINDO(GONDOLA),"You are engulfed in a conflagration as the balloon explodes in a ball of flame!\n");
    ppl=all_inventory(FINDO(GONDOLA));
    i=sizeof(ppl);
    while(i--){
	if(ppl[i]->is_player()){
	    tell_object(ppl[i],"The flames sear your flesh!\n");
	    ppl[i]->take_damage(random(100)+20);
	    tell_object(ppl[i],"You find yourself in mid air!\n\n\n");
	    move_object(ppl[i],"/zone/null/eternal/school/mid_air");
	    ppl[i]->glance();
	}
    }
    destruct(THISO);
    return 1;
}
