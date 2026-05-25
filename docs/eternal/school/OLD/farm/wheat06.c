inherit RoomPlusCode;

void extra_create()
{
    set("short","On the Northern Edge of a Vast Field of Wheat");
    set( "day_long",
      "The countless rows of golden wheat would seem to march on forever if they "
      "didn't run into the incredible granite cliff that looms up into the sky.  "
      "The cliff face runs as far as you can see to the east and west, prohibiting "
      "any furhter travel to the north."
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
	"west":"/zone/null/eternal/school/farm/wheat05",
	"east":"/zone/null/eternal/school/farm/wheat07",
	"south":"/zone/null/eternal/school/farm/wheat16",
	"southeast":"/zone/null/eternal/school/farm/wheat17",
	"southwest":"/zone/null/eternal/school/farm/wheat15",
      ]) );
}
