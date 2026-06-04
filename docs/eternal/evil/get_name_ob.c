inherit ObjectCode;
#define LOGFILE "/zone/null/eternal/evil/LOG/dance.log"

object shaker;
string whonamed;

void extra_create(){
     seteuid(getuid());
     add("id","consent_object");
     set("droppable", 0);
     set("gettable", 0);
}

void extra_init(){
	write("The spirit of Dave appears before you!\n"+
	      "You are in awe of his presence and power.\n");
	tell_room(environment(THISP),
	   "The spirit of Dave the Dragon of Death appears before "+
	   PNAME+"!\n", ({ THISP }));
	write("Dave says: Your dance has captured my attention.\n");
	write("Dave says: You may now \"name\" a player who you think "+
	      "deserves\n           my wrath.\n");
	add_action("do_name", "name");
	call_out("do_ignore", 30);
}

void dest_me(){
	destruct(THISO);
}

void do_ignore(){
	tell_object(environment(THISO),
	   "Dave sneers at you.\nDave says: You take too long, fool.\n");
	tell_room(environment(environment(THISO)), 
	   "The spirit of Dave disappears into the mist.\n");
	call_out("dest_me", 0);
}

int do_name(string foo){
	if(!foo || foo=="") return 0;
	whonamed=foo;
	write("You name "+capitalize(foo)+" for Dave.\n");
	say("The word \""+capitalize(foo)+"\" escapes from "+
	    PNAME+"'s lips.\n");
	write("Dave laughs at you.\n");
	write("Dave says: "+capitalize(foo)+"?!?  That pathetic creature?!?\n"+
	      "           Are you sure it is worthy of my attention?\n");
	write("Answer YES or NO --> ");
	input_to("do_confirm");
	return 1;
}

int do_confirm(string foo){
	if(!foo || foo=="" || foo=="N" || foo=="n" || foo=="NO" ||
	   foo=="No" || foo=="no" || foo=="nO"){
	   write("Dave says: Very well, then.  You may name another.\n");
	   return 1;
	}
	write("Dave says: Okay, I'll think about it.\n");
	write("Dave says: I still can't believe you need my help with a "+
	      "weakling\n           like "+capitalize(whonamed)+".\n");
	tell_room(environment(environment(THISO)),
		  "The spirit of Dave disappears.\n");
	   if(GetPWNam(PRNAME)[2] == "mortal" &&
	      PRNAME[0..1]!="zz")
	   write_file(LOGFILE, lower_case(whonamed)+"##"+PRNAME+"##\n");
	call_out("dest_me", 0);
	return 1;
}
