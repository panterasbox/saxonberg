inherit ThingCode;
mapping path;
object BALLOON, GONDOLA;

status start_run()
{
    ClockObject->set_alarm("start_run",0);
    THISO->call_for_move();
    return 1;
}

status call_for_move()
{
    if(!present_path("/zone/null/eternal/school/pilot",GONDOLA))
    {
	return 1;
    }
    switch(query("step")){
    case 1:  
	set("step",2);
	break;
    case 2:
	set("step",3);
	break;
    case 3:
	set("step",4);
	break;
    case 4:
	set("step",5);
	break;
    default :
	set("step",1);
	break;
    }   
    if(query("step")!=1&&query("step")!=5)
	call_out("call_for_move",75);
    if(query("step")==5)
	set("step",1);
    BALLOON->move_balloon(path[query("step")],"The Pilot");
    return 1;
}

void extra_create()
{
    set("id",({"balloon server","server"}));
    set("short","a balloon server");
    set("long","You shouldn't see this.");
    set("invis",1);
    set("gettable",0);
    path=([
      1:"/zone/null/eternal/school/parking_lot",
      2:"/zone/null/eternal/school/mid_air",
      3:"/zone/null/eternal/lounge/lounge",
      4:"/zone/null/eternal/school/mid_air",
    ]);
    set("step",1);
    BALLOON=clone_object("/zone/null/eternal/school/balloon");
    GONDOLA=FINDO("/zone/null/eternal/school/gondola");
    move_object(BALLOON,path[query("step")]);
    ClockObject->set_alarm("start_run",0); 
    call_other("/zone/null/eternal/school/falling","????");
}

status set_gondola(object gonad)
{
    GONDOLA=gonad;
    return 1;
}
