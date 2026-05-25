inherit RoomPlusCode;

void
extra_create()
{
  set( "map_symbol", "TP" );
  set( "map_hint_x", -1 );
  set( "short", "EotL Teleport Authority: Eternal City Terminal" );
  set( "day_long", "The Eternal City Terminal is the largest hub in the EotL "
                   "TPA network.  There are three departure gates to the "
                   "west, and the main hall of the station serves as a "
                   "waiting area for those travelers who are seeking a "
                   "specific stop.  Rows of benches line the floor of the "
                   "hall, though not many people seem to be very interested "
                   "in sitting down.  Instead, they anxiously listen for "
                   "their stop to be called out on the loudspeaker, "
                   "simultaneously trying to stay out of the way of people "
                   "exiting from the arrival gate to the north.  Plastered "
                   "all over the station walls are signs reading, "
                   "\"Absolutely No Littering\".  The walls are otherwise "
                   "bare, except for the TPA ticket window to the south." );
  set( "day_light", WELL_LIT );
  set( "night_light", PART_LIT );
  set( "exits", ([ "east" : "/zone/null/eternal/room015",
                   "west" : "/zone/null/eternal/tpa/depart2",
                   "northwest" : "/zone/null/eternal/tpa/depart1",
                   "southwest" : "/zone/null/eternal/tpa/depart3",
                   "north" : "/zone/null/eternal/tpa/arrive",
                   "south" : "/zone/null/eternal/tpa/office" ]) );
  set( "descs", ([ ({ "departure gates", "gates", 
                      "gate", "arrival gate" }) :
                   "Each of the departure gates allows travel to a fixed set "
                   "of destinations.  The arrival gate is the rally point "
                   "for players traveling to Eternal City from other parts "
                   "of EotL.  Seeing masses of people disappear to the west "
                   "without anyone coming out is more than a little "
                   "off putting.",
                   ({ "bench", "benches" }) :
                   "These fiberglass benches don't appear to be very "
                   "comfortable.  They also smell a lot like Chuck the "
                   "Drunkard.  You're probably better off standing.",
                   ({ "loudspeaker", "speaker", 
                      "loudspeakers", "speakers" }) :
                   "There are about a dozen speakers are mounted into the "
                   "ceiling in various locations.  The majority of the "
                   "announcements are read by one of those computer "
                   "generated voices that is littered with annoying little "
                   "pauses in all the wrong places.",
                   ({ "sign", "signs" }) :
                   "The signs are only spaced like 3 feet apart.  Whoever "
                   "put them up must really hate littering.",
                   ({ "wall", "walls" }) :
                   "No paint job could ever save these walls from the cheap "
                   "fluorescent light being reflected off them.",
                   ({ "window", "ticket window", 
                    "TPA window", "TPA ticket window" }) :
                    "You're going to have to step up to the window if you "
                    "need service."
                   ]) );
  set( InsideP, 1 );
  return;
}

void
gate_signal( int gate, string station )
{
  tell_room(THISO, format(sprintf("A voice comes over the loudspeaker, "
            "\"Gate %d now departing for %s Station.\"\n", gate, station)) );
  return;
}
