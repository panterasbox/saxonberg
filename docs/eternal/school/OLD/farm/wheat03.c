inherit RoomPlusCode;

void extra_create()
{
    set("short","On the Northern Edge of a Vast Field of Wheat");
    set( "day_long",
      "This is the end of the wheatfield.  You're standing in front of an immense "
      "granite cliff that entirely blocks any imaginable travel to the north.  "
      "In all other directions around you, the rows of wheat stretch to the end "
      "of your ability to see."
    );
    set("descs", ([
	({ "grain","row","rows", "wheat" }) :
	"This grain is rich and plentiful.  It has taken root in the warm black soil that makes up "
	"this sheltered plain.  The stalks of grain line up in careful "
	"rows as far as your eye can see.",
	({ "cliff", "face", "cliff face" }) :
	"This cliff face goes straight up for about 300 feet and then gradually "
	"inclines to form huge, sky-piercing peaks of granite.  As you incline "
	"your head to look at the cliff, high in the sky you see something "
	"floating along up there.  It's not a bird, it's not a star...  What "
	"could it be?",
      ]) );
    set(OutsideP,1);
    set("exits", ([
	"west":"/zone/null/eternal/school/farm/wheat02",
	"east":"/zone/null/eternal/school/farm/wheat04",
	"south":"/zone/null/eternal/school/farm/wheat13",
	"southeast":"/zone/null/eternal/school/farm/wheat14",
	"southwest":"/zone/null/eternal/school/farm/wheat12",
      ]) );
}
