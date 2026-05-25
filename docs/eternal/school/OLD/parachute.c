inherit ArmorCode;
#define MIDAIR "/zone/null/eternal/school/mid_air"
#define FALLING "/zone/null/eternal/school/falling"
#define PFALLING "/zone/null/eternal/school/pfalling"

void extra_create()
{
    set("id",({"parachute","chute"}));
    set("short","a parachute");
    set("long",
      "This parachute looks like a square, green, canvas backpack.  You can "
      "tell it's not a backpack, though, because of the stenciled black letters "
      "on the side that say \"EotL School Parachute\".  There is a ripcord on "
      "the parachute."
    );
    set("packed",1);
}

void extra_init()
{
    add_action("pull_rip","pull");
    add_action("do_pack","pack");
}

status pull_rip(string wot)
{
    if(wot!="ripcord"&&wot!="rip cord")return 0;
    if(ENV(THISI)==FINDO(PFALLING)){
	tell_object(THISI,"You've already pulled your ripcord and are under a deployed canopy.  Enjoy the ride.\n");
	return 1;
    }
    if(!query("packed")){
	tell_object(THISI,"The chute must be packed before pulling the ripcord will have any effect.\n");
	return 1;
    }
    if(ENV(THISI)!=FINDO(MIDAIR)&&ENV(THISI)!=FINDO(FALLING)){
	tell_object(THISI,"You pull on the ripcord and the chute opens onto the ground.\n");
	tell_room(ENV(THISI),PNAME+" pulls on the ripcord of "+possessive(THISI)+" parachute and "
	  "the chute deploys onto the ground.  Whoopee.\n",({THISI}));
	set("packed",0);
	return 1;
    }
    if(!query("worn")){
	tell_object(THISI,"You yank on the ripcord and the chute deploys!\n"
	  "Unfortunately, you weren't wearing the chute and it flies off into the sky.\n");
	tell_room(ENV(THISI),
	  PNAME+" yanks on the ripcord of "+possessive(THISI)+" parachute and it deploys!\n"
	  "Unfortunately, "+PNAME+" wasn't wearing the chute and it flies off into the sky.\n",({THISI}));
	destruct(THISO);
	return 1;
    }
    "/zone/null/eternal/school/falling"->chute_deployed(THISI);
    tell_object(THISI,"You yank on the ripcord and the chute deploys!  You drift peacefully towards the ground.\n");
    tell_room(ENV(THISI),PNAME+" yanks the ripcord on "+possessive(THISI)+" parachute and the chute deploys!  "+objective(THISI)+" begins to drift peacfully towards the ground.\n",({THISI}));
    THISI->set("chute",1);
    set("packed",0);
    return 1;
}

status do_pack(string wot)
{
    if(!id(wot))return 0;
    if(ENV(THISI)==FINDO(MIDAIR)||ENV(THISI)==FINDO(FALLING)){
	tell_object(THISI,
	  "You try to pack the chute, but it's too hard to do while plummetting towards the hard packed ground.\n");
	return 1;
    }
    if(query("packed")){
	tell_object(THISI,"The parachute is already packed.\n");
	return 1;
    }
    if(query("worn")){
	tell_object(THISI,"You must remove the parachute before you can pack it.\n");
	return 1;
    }
    set("packed",1);
    tell_object(THISI,"You fold the chute carefully back into its pack.\n");
    tell_room(ENV(THISI),
      PNAME+" lays "+possessive(THISI)+" chute on the ground and folds it carefully into its pack.\n",
      ({THISI}));
    return 1;
}

string post_short()
{
    switch(query("worn")){
    case 1 :
	return(
	  query("packed")?" [packed] (worn)":" [unpacked] (worn)"
	);
	break;
    default :
	return(
	  query("packed")?" [packed]":" [unpacked]"
	);
	break;
    }
}

string post_long()
{
    return(
      query("packed")?"The parachute is packed.":"The parachute is unpacked."
    );
}

status remove_signal(object who)
{
    if (ENV(who)==FINDO(FALLING)||ENV(who)==FINDO(PFALLING)||ENV(who)==FINDO(MIDAIR)){
	tell_object(who,"You remove your parachute while in mid-air.  It flies out of your grasp into the sky.\n");
	return 0;
    }
    return 0;
}

remove_comm(object me)
{
    destruct THISO;
    return 1;
}
