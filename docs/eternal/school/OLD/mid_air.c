inherit RoomCode;
object LEVER;
int alt;

string short()
{
    if(LEVER)
	alt=(LEVER->query("alt"))+random(LEVER->query("alt")/10);
    return(alt+" feet in the sky\n");
}

long()
{
    int alt2;
    string long;
    alt2=LEVER->query("alt");
    switch(alt2)
    {
    case 10 :
	long =
	short()+strformat("    From here you can see the ground about "
	  "ten feet or so below you.  If you had a fear of heights, "
	  "it might be kicking in at about this time.  You wouldn't "
	  "die falling from this height, but who knows, you could "
	  "be injured.");
	break;
    case 500 :
	long =
	short()+strformat("    Things look pretty small from up here...  "
	  "If there were any sky scrapers around, you'd be scraping "
	  "them.  The winds up here are pretty gusty, being so far "
	  "above any land resistance.  A fall from here would have "
	  "significant consequences.");
	break;
    case 2000 :
	long =
	short()+strformat("    You're approaching clouds up here.  The ground "
	  "is a distant memory.  From up here, you can see pretty much "
	  "the tops of trees and well worn paths.  It would take some "
	  "tremendous haystack to save you from a fall from this height.");   
	break;
    case 5000 :
	long =
	short()+strformat("    You're actually in the clouds here.  Occasionally "
	  "one will pass by, soaking you in its mist.  You can "
	  "see a panoramic view of crops and forest laid out in "
	  "a grid far, far below.  Now would be a good time to "
	  "pull the ripcord on your parachute, assuming you have "
	  "one.");
	break;
    case 20000 :
	long =
	short()+strformat("    You're above the clouds now.  They look "
	  "like a make believe landscape molded from whipped "
	  "cream.  It's noticeably cooler up here...  Perhaps "
	  "you should've brought a sweater.  The air seems thinner, "
	  "too.  You notice that you're panting for breath.  "
	  "At almost 4 miles from the surface of the planet, "
	  "you're in a position few get to experience and live to "
	  "tell about.  Let's hope you can.");
	break;
    default :
	long =
	"This room stinkeths.";
	break;
    }
    return(long+"\n");
}

status set_lever(object obj)
{
    string sho;
    LEVER=obj;
    sho=short();
    set("short",sho);
    return 1;
}

void do_fall(object pancake, int set)
{
    if(!present(pancake))return;
    FINDO("/zone/null/eternal/school/falling")->begin_call(alt/500, pancake);
    tell_object(pancake,"You plummet towards the ground!\n");
    move_object(pancake,"/zone/null/eternal/school/falling");
}

void extra_init()
{
    if(is_player(THISP))
	call_out("do_fall",random(5),THISP, alt );
}
