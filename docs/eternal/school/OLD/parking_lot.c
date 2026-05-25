inherit RoomPlusCode;

void extra_create()
{
    set("short","The EotL School Parking Lot");
    set("day_long",
      "This is the paved parking lot in front of the EotL "
      "school where before and after classes, the big "
      "yellow balloons land gently and bring all the happy "
      "students home to afternoon cartoons and nappy-times.  "
      "The school stands to your north and a busy road "
      "runs past the school and around the lot."
    );
    set("day_light",BRIGHT);
    set(OutsideP,1);
    set("exits", ([
	"north":"/zone/null/eternal/school/room01",
	"road":"/zone/null/eternal/school/road",
      ]) );
    set("descs", ([
	({"lot","parking lot"}):
	"This lot is paved with black asphalt and lined with yellow "
	"paint.  There are no cars parked in the lot at this time.  "
	"In fact, there is no sign that a car was ever in the lot to "
	"begin with.",
	({"road","busy road"}):
	"This road runs around the perimeter of the parking lot and "
	"past the school.  Traffic rushes by at an alarming speed.  "
	"There is a road sign planted in the ground next to the road.",
	({"sign","road sign"}):
	"The sign reads: Eternal City -- 23 miles",
	"traffic":
	"The cars and trucks here seem to roar by with little regard "
	"for the safety of pedestrians.  You notice several people "
	"reading and applying makeup as they cruise by.",
	({"school","EotL school","EOTL School","School"}):
	"The school is a tall, wood building.  It's been painted "
	"red and here and there you see that it has begun to peel.  "
	"Through a window, you can see that the interior looks "
	"warm and dry, a great atmosphere for academics.",
      ]) );
    set("reset_data",
      ([
	"roy":"/zone/null/eternal/school/roy",
	"sign":"/zone/null/eternal/school/sign",
      ]) );
}

query_leave_ok()
{
    if(present_path("/zone/null/eternal/school/roy")&&
      query_verb()=="road"){
	present_path("/zone/null/eternal/school/roy")->do_save(THISP);
	return 1;
    }
    if(present_path("/zone/null/eternal/school/roy")&&(query_verb()=="north"||query_verb()=="n")&&
      (THISP->query("suspended")+86400>time())){
	present_path("/zone/null/eternal/school/roy")->suspend(THISP);
	return 1;
    }
    if(present_path("/zone/null/eternal/school/roy"))
	THISP->set("suspended",0);
    return 0;
}

string exit_message(string dir)
{
    if(dir=="road")
	return( "towards the "+dir);
    else return(dir);
}
