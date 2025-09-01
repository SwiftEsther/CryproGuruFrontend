import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { CRYPTO_GURU_SERVICE_BASE_URL } from '../../utils/apiCOnstants';
import type { BTCPrice, GuessType, Player } from '../../utils/interfaces';
import { 
  MdInfo, 
  MdTrendingUp, 
  MdTrendingDown, 
  MdClose, 
  MdArrowForward,
  MdCircle
} from 'react-icons/md';

const GamePage = () => {
  const [playerId, setPlayerId] = useState<string | undefined>(undefined);
  const [player, setPlayer] = useState<Player | null>(null);
  const [btcPrice, setBtcPrice] = useState<BTCPrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>('');
  const [gameStarted, setGameStarted] = useState(false);
  const [localTimeRemaining, setLocalTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    const savedPlayerId = localStorage.getItem('crypto-guru-player-id');
    if (savedPlayerId) {
      setPlayerId(savedPlayerId);
      setGameStarted(true);
    }

    fetchBTCPrice();
    if(playerId) {
      getPlayerById();
    }
  }, []);

  const fetchBTCPrice = useCallback(async () => {
    try {
      const response = await axios.get(`${CRYPTO_GURU_SERVICE_BASE_URL}/btc/price`);
      setBtcPrice(response.data);
    } catch (err) {
      setError('Failed to load BTC price');
    }
  }, []);

  const getPlayerById = useCallback(async () => {
    console.log('Fetching player data for playerId:', playerId);
    if (!playerId) return;
    try {
      const response = await axios.get(`${CRYPTO_GURU_SERVICE_BASE_URL}/players/${playerId}`);
      setPlayer(response.data);
    } catch (err) {
      setError('Failed to load player status');
    }
  }, [playerId]);

  const createPlayer = async () => {
    setLoading(true);
    setError('');
    if(playerId) {
      setGameStarted(true);
      setLoading(false);
      return;
    }
    try {
      const response = await axios.post(`${CRYPTO_GURU_SERVICE_BASE_URL}/players`);
      const newPlayerId = response.data.player.playerId;
      setPlayerId(newPlayerId);
      localStorage.setItem('crypto-guru-player-id', newPlayerId);
      setGameStarted(true);
    } catch {
      setError('Failed to create player. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitGuess = async (direction: GuessType) => {
    if (!playerId || !btcPrice) return;
    setLoading(true);
    setError('');
    try {
      await axios.post(`${CRYPTO_GURU_SERVICE_BASE_URL}/players/${playerId}/guess`, {
        direction,
        currentPrice: btcPrice.price
      });
      await getPlayerById();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to submit guess');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!gameStarted) return;

    const interval = setInterval(() => {
      fetchBTCPrice();
      if(playerId) {
        getPlayerById(); // TODO: Confirm design impact, do I really need this every 30 seconds?
      }
    }, 30000); // Tenporary fix for the 429 error from coingecko API, ideally this would be lesser

    return () => clearInterval(interval);
  }, [gameStarted, fetchBTCPrice, getPlayerById]);

  useEffect(() => {
    if (!player?.pendingGuess || !player.timeRemainingSeconds) {
      setLocalTimeRemaining(null);
      return;
    }

    setLocalTimeRemaining(player.timeRemainingSeconds);

    const countdown = setInterval(() => {
      setLocalTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [player?.pendingGuess, player?.timeRemainingSeconds]);

  const resetGame = () => {
    // localStorage.removeItem('crypto-guru-player-id'); // For now, I'll remove the ability to clear playerId so we don't create a new player every time
    setPlayerId(undefined);
    setPlayer(null);
    setBtcPrice(null);
    setGameStarted(false);
    setError('');
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 text-gray-800 p-4'>
      {gameStarted ? (
        <div className="min-h-screen bg-gray-50">
          <div className='absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 opacity-40'></div>
          <div className="relative z-10 p-4 sm:p-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  Crypto Guesser
                </h1>
                <button
                  onClick={resetGame}
                  className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
                >
                  Reset Game
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-white/20">
                  <div className="text-center">
                    <h2 className="text-base sm:text-lg font-medium text-gray-600 mb-2">Your Score</h2>
                    <p className="text-3xl sm:text-4xl font-bold text-emerald-500">
                      {player?.player.score || 0}
                    </p>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-white/20">
                  <div className="text-center">
                    <h2 className="text-base sm:text-lg font-medium text-gray-600 mb-2">BTC Price {!btcPrice?.price && <span className='text-xs text-amber-300'>Price below is inaccurate and will be updated soon</span>}</h2>
                    <p className="text-2xl sm:text-4xl font-bold text-blue-600">
                      ${btcPrice?.price?.toLocaleString() || 0}
                    </p>
                    {btcPrice?.ageSeconds !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        Updated {btcPrice.ageSeconds}s ago {btcPrice.isStale && ' (stale)'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20">
                {player?.pendingGuess ? (
                  <div className="text-center">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Guess Pending</h3>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-blue-100">
                      <p className="text-base sm:text-lg mb-2">
                        You guessed: 
                        <span className={`font-bold ml-2 ${
                          player.pendingGuess.direction === 'UP' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {player.pendingGuess.direction.toUpperCase()}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">From ${player.pendingGuess.priceAtGuess.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{new Date(player.pendingGuess.guessTimestamp).toLocaleTimeString()}</p>
                    </div>
                    {localTimeRemaining !== null && localTimeRemaining > 0 ? (
                      <div className="flex items-center justify-center gap-2">
                        <MdCircle className="w-3 h-3 text-blue-500 animate-pulse" />
                        <p className="text-gray-600 text-sm sm:text-base">
                          Time remaining: <span className="font-mono font-semibold">{localTimeRemaining}s</span>
                        </p>
                      </div>
                    ) : localTimeRemaining === 0 ? (
                      <div className="flex items-center justify-center gap-2">
                        <MdCircle className="w-3 h-3 text-green-500 animate-pulse" />
                        <p className="text-green-600 text-sm sm:text-base font-semibold">
                          Ready to resolve! Waiting for server...
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-center">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Make Your Prediction</h3>
                    <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">
                      Will Bitcoin's price be higher or lower in 60+ seconds?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md mx-auto">
                      <button
                        onClick={() => submitGuess('UP')}
                        disabled={loading || !btcPrice || (!!player?.timeRemainingSeconds && player.timeRemainingSeconds > 0)}
                        className="group flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 sm:py-4 px-6 sm:px-8 rounded-xl text-lg sm:text-xl font-bold disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <MdTrendingUp className="w-5 sm:w-6 h-5 sm:h-6" />
                          UP
                        </span>
                      </button>
                      <button
                        onClick={() => submitGuess('DOWN')}
                        disabled={loading || !btcPrice || (!!player?.timeRemainingSeconds && player.timeRemainingSeconds > 0)}
                        className="group flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 sm:py-4 px-6 sm:px-8 rounded-xl text-lg sm:text-xl font-bold disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <MdTrendingDown className="w-5 sm:w-6 h-5 sm:h-6" />
                          DOWN
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {error && (
                <div className="mt-4 sm:mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-red-700 text-sm sm:text-base pr-2">{error} Try resetting game with the "Reset Game" button above</p>
                    <button
                      onClick={() => setError('')}
                      className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                    >
                      <MdClose className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        ) : (
        <div className='min-h-screen bg-gray-50'>
          <div className='absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 opacity-60'></div>
          <div className='relative z-10 px-4 py-8 sm:py-12'>
            <div className='max-w-4xl mx-auto'>
              <div className='text-center mb-12 sm:mb-16'>
                <div className='bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-12 shadow-2xl border border-white/20 mb-8 sm:mb-12'>
                  <h1 className='text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
                    CryptoGuess
                  </h1>
                  <div className='w-16 sm:w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto mb-4 sm:mb-6'></div>
                  <p className='text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed max-w-2xl mx-auto px-2'>
                    Test your market analysis skills by predicting short-term Bitcoin price movements. 
                    A fun way to learn about cryptocurrency market patterns and develop trading intuition.
                  </p>
                  
                  <button
                    onClick={createPlayer}
                    disabled={loading}
                    className='group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 sm:py-4 px-8 sm:px-12 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-bold disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none w-full sm:w-auto'
                  >
                    <span className='flex items-center justify-center gap-3'>
                      {loading ? (
                        <>
                          <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin'></div>
                          Starting Game...
                        </>
                      ) : (
                        <>
                          Start Playing
                          <MdArrowForward className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
                        </>
                      )}
                    </span>
                  </button>
                  
                  {error && (
                    <div className='mt-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
                      <p className='text-red-600'>{`error?.message`}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12'>
                <div className='bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg border border-white/20'>
                  <div className='flex items-center mb-4'>
                    <h2 className='text-xl sm:text-2xl font-bold text-gray-800'>What is CryptoGuess?</h2>
                  </div>
                  <p className='text-gray-600 leading-relaxed mb-4 text-sm sm:text-base'>
                    CryptoGuess is an educational tool that helps you understand Bitcoin price volatility 
                    by making short-term predictions. You'll predict whether Bitcoin's price will be 
                    higher or lower after exactly one minute.
                  </p>
                  <p className='text-gray-600 leading-relaxed text-sm sm:text-base'>
                    It's designed to help you learn about market patterns, timing, and the unpredictable 
                    nature of cryptocurrency markets in a risk-free environment.
                  </p>
                </div>

                <div className='bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg border border-white/20'>
                  <div className='flex items-center mb-4'>
                    <h2 className='text-xl sm:text-2xl font-bold text-gray-800'>Educational Purpose</h2>
                  </div>
                  <p className='text-gray-600 leading-relaxed mb-4 text-sm sm:text-base'>
                    This game uses real Bitcoin price data to demonstrate how unpredictable 
                    short-term price movements can be, even for experienced traders.
                  </p>
                  <p className='text-gray-600 leading-relaxed text-sm sm:text-base'>
                    Perfect for learning about market volatility, developing patience, 
                    and understanding why long-term investing strategies often outperform 
                    short-term speculation.
                  </p>
                </div>
              </div>
              <div className='bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg border border-white/20'>
                <div className='flex items-center mb-4 sm:mb-6'>
                  <div className='w-10 sm:w-12 h-10 sm:h-12 bg-indigo-100 rounded-xl flex items-center justify-center mr-3 sm:mr-4'>
                    <MdInfo className='w-5 sm:w-6 h-5 sm:h-6 text-indigo-600' />
                  </div>
                  <h2 className='text-2xl sm:text-3xl font-bold text-gray-800'>How to Play</h2>
                </div>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8'>
                  <div>
                    <h3 className='text-lg sm:text-xl font-semibold text-gray-800 mb-4'>Game Mechanics</h3>
                    <div className='space-y-3 sm:space-y-4'>
                      <div className='flex items-start gap-3'>
                        <span className='flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold'>1</span>
                        <p className='text-gray-600 text-sm sm:text-base'>View the current Bitcoin price in USD and your score</p>
                      </div>
                      <div className='flex items-start gap-3'>
                        <span className='flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold'>2</span>
                        <p className='text-gray-600 text-sm sm:text-base'>Choose "UP" if you think the price will be higher in 60+ seconds, or "DOWN" if lower</p>
                      </div>
                      <div className='flex items-start gap-3'>
                        <span className='flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold'>3</span>
                        <p className='text-gray-600 text-sm sm:text-base'>Wait for at least 60 seconds while the price updates</p>
                      </div>
                      <div className='flex items-start gap-3'>
                        <span className='flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold'>4</span>
                        <p className='text-gray-600 text-sm sm:text-base'>Your guess resolves automatically when conditions are met</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className='text-lg sm:text-xl font-semibold text-gray-800 mb-4'>Scoring System</h3>
                    <div className='space-y-3 sm:space-y-4'>
                      <div className='flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200'>
                        <div className='w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0'>
                          <span className='text-white font-bold text-sm'>+1</span>
                        </div>
                        <p className='text-emerald-700 text-sm sm:text-base'>Correct prediction adds 1 point</p>
                      </div>
                      <div className='flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200'>
                        <div className='w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0'>
                          <span className='text-white font-bold text-sm'>-1</span>
                        </div>
                        <p className='text-red-700 text-sm sm:text-base'>Incorrect prediction subtracts 1 point</p>
                      </div>
                      <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200'>
                        <div className='w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0'>
                          <span className='text-white font-bold text-sm'>0</span>
                        </div>
                        <p className='text-gray-700 text-sm sm:text-base'>As a new player, you'll start at 0 and that's fine</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GamePage;