inherit ObjectCode;
#define AIR "/zone/null/eternal/school/mid_air"
object BALLOON;
string whereto, room, oroom;
mapping alts;
int top;

void extra_create()
{
    set("id",({"lever","metal lever","gauge","lever and gauge"}) );
    set("short","a metallic lever with an inset, glass-covered gauge");
    set("gettable",0);
    if(clonep())
	AIR->set_lever(THISO);
    whereto="Nowhere in particular";
    alts=([0:0,1:10,2:500,3:2000,4:5000,5:20000]);
}

void extra_init()
{
    add_action("checkGauge","look");
    add_action("pullLever","pull");
    add_action("pullLever","push");
    add_action("pushButton","press");
}

status setDest(string dest)
{
    switch(dest)
    {
    case "/zone/null/eternal/lounge/lounge" :
	room=dest;
	whereto="Eternal City Lounge";
	break;
    case "/zone/null/eternal/school/parking_lot" :
	room=dest;
	whereto="Eternal City Public School";
	break;
    default :
	room=dest;
	whereto="Nowhere in particular";
	break;
    }
    return 1;
}

status checkGauge( string wot )
{
    if(!id(wot)&&wot!="at lever"&&wot!="at gauge")return 0;
    printf("The lever has five settings:\n"
      "0--No flame\n"
      "1--Hover flame\n"
      "2--Climb flame\n"
      "3--Soar flame\n"
      "4--Cruise flame\n"
      "5--Too much flame\n\n"
      "The lever is currently set at: %d\n"
      "The gauge currently reads: %d feet\n",
      query("set"),
      (query("alt")+random(query("alt")/10)));
    printf("The button on top of the lever reads: %s\n",whereto);
    return 1;
}

status pushButton(string bob)
{
    if(bob!="button")return 0;
    if(query("set"))
    {
	tell_object(THISP,"You push the button on top of the lever.\nThe button goes CLONK.\n");
	tell_room(ENV(THISP),PNAME+" pushes the button on top of the lever.\nThe button goes CLONK.\n",({THISP}));
	return 1;
    }
    whereto=="Eternal City Lounge"?setDest("/zone/null/eternal/school/parking_lot"):setDest("/zone/null/eternal/lounge/lounge");
    tell_room(ENV(THISP),PNAME+" pushes the button on top of the lever.\nThe button goes CLICK.\n",({THISP}));
    tell_object(THISP,"You push the button on top of the lever.\nThe button goes CLICK.\n");
    return 1;
}

status parseMove(object who, int dir)
{
    string tmproom;
    tmproom=room;
    switch(dir)
    {
    case 0 :
	if(query("set")==1)
	{
	    set("set",0);
	    set("alt",alts[0]);
	    if(!top&&oroom!=tmproom)
		tmproom=="/zone/null/eternal/lounge/lounge"?tmproom="/zone/null/eternal/school/parking_lot":
		tmproom="/zone/null/eternal/lounge/lounge";
	    top=0;
	    oroom=tmproom;
	    BALLOON->move_balloon(tmproom, who->query_name());
	    break;
	}
	set("set",query("set")-1);
	set("alt",alts[query("set")]);
	break;
    case 1 :
	if(!query("set"))
	{
	    BALLOON->move_balloon(AIR,who->query_name());
	    set("alt",alts[dir]);
	    set("set",1);
	    break;
	}
	set("set",query("set")+1);
	set("alt",alts[query("set")]);
	if(query("set")==5)
	    BALLOON->begin_too_high();
	if(query("set")==4)
	    top=1;
	break;
    }
    return 1;
}
status pullLever(string wot)
{
    object bob;
    if(wot=="button")return pushButton("button");
    if(wot!="lever")return 0;
    if(bob=present_path("/zone/null/eternal/school/pilot",ENV(THISI)))
	return bob->no_wei_you_turd(THISP);
    if(whereto=="Nowhere in particular")
    {
	tell_object(THISP,"You "+(query_verb()=="pull"?"yank":"shove")+" on the lever, "
	  "but it refuses to move.\n");
	tell_room(ENV(THISO),PNAME+(query_verb()=="pull"?"yanks":"shoves")+" on the lever, "
	  "but it doesn't budge.\n",({THISP}));
	return 1;
    }
    switch(query_verb())
    {
    case "push" :
	if(!query("set"))
	{
	    tell_object(THISP,"You push on the lever and perceive no effect.\n");
	    tell_room(ENV(THISO),PNAME+" pushes on the lever, to no effect.\n",({THISP}));
	    return 1;
	}
	if(query("set")!=1)
	{
	    tell_object(THISP,"You push on the lever, reducing the flame.\n");
	    tell_room(ENV(THISO),PNAME+" pushes on the lever, reducing the flame.\n",({THISP}));
	}
	parseMove(THISP,0);
	break;
    case "pull" :
	if(query("set")==5)
	{
	    tell_object(THISP,"You pull on the lever, but the flame does not increase.\n");
	    tell_room(ENV(THISO),PNAME+" pulls on the lever, but the flame does not increase.\n",({THISP}));
	    return 1;
	}
	if(query("set"))
	{
	    tell_object(THISP,"You pull on the lever, increasing the flame.\n");
	    tell_room(ENV(THISO),PNAME+" pulls on the lever, increasing the flame.\n",({THISP}));
	}
	parseMove(THISP,1);
	break;
    default :
	break;
    }
    return 1;
}

status set_balloon(object buh)
{
    BALLOON=buh;
    return 1;
}

void set_oroom(string foo)
{
    oroom=foo;
}
