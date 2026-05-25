inherit RoomCode;

int height(object buh)
{
    int i;
    mixed *a, *b;
    a=call_out_info();
    i=sizeof(a);
    while(i--)
    {
	if(a[i][0]==THISO&&a[i][3]==buh)
	{
	    b=a[i];
	    break;
	}
    }
    return (b[2]*250-random(b[2]*25));
}

string short()
{
    int hgt;
    hgt=height(THISI);
    return(hgt + " Feet Above the Ground\n");
}

long()
{
    string long;
    switch(height(THISI))
    {
    case 1 .. 50 :
	long =
	short()+strformat("    From here you can see the ground "
	  "not too far below below you.  If you had a fear of heights, "
	  "it might be kicking in at about this time.  You wouldn't "
	  "die falling from this height, but who knows, you could "
	  "be injured.");
	break;
    case 51 .. 1200 :
	long =
	short()+strformat("    Things look pretty small from up here...  "
	  "If there were any sky scrapers around, you'd be scraping "
	  "them.  The winds up here are pretty gusty, being so far "
	  "about and land resistance.  A fall from here would have "
	  "significant consequences.");
	break;
    case 1201 .. 3500 :
	long =
	short()+strformat("    You're approaching clouds up here.  The ground "
	  "is a distant memory.  From up here, you can see pretty much "
	  "the tops of trees and well worn paths.  It would take some "
	  "tremendous haystack to save you from a fall from this height.");   
	break;
    case 3501 .. 8500 :
	long =
	short()+strformat("    You're actually in the clouds here.  Occasionally "
	  "one will pass by, soaking you in its mist.  You can "
	  "see a panoramic view of crops and forest laid out in "
	  "a grid far, far below.  Now would be a good time to "
	  "pull the ripcord on your parachute, assuming you have "
	  "one.");
	break;
    case 8501 .. 25000 :
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
	short()+strformat("    You're plummeting towards the ground at an alarming rate.");
	break;
    }
    return (long);
}

begin_call(int time, object pancake)
{
    call_out("hit_the_ground",time*2,pancake,2);
}


hit_the_ground(object pancake, int chute)
{
    if(chute==2&&!pancake->query("chute"))
    {
	tell_object(pancake,"You hit the ground.\n");
	move_object(pancake, "/zone/null/eternal/school/farm/wheat"+random(2)+random(10));
	pancake->glance();
	pancake->take_damage(500);
    }
    else
    {
	tell_object(pancake,"You land softly.\n");
	move_object(pancake,"/zone/null/eternal/school/farm/wheat"+random(2)+random(10));
	pancake->set("chute",0);
	pancake->glance();
    }
}

